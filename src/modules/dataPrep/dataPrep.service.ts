import type { Conversation, RawTweet } from "../../common/types/tweet.types";
import { streamCsv } from "../../common/utils/csvLoader";
import { logger } from "../../common/utils/logger";
import type { DataPrepOptions } from "./dataPrep.types";

/**
 * Splits a comma-separated ID string into individual IDs.
 * "12,15,18" -> ["12", "15", "18"]
 */
function parseIds(value: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Rough heuristic: is this text mostly Latin-script (English/European)?
 * Not perfect NLP language detection, but good enough to filter out
 * Japanese/Arabic/etc conversations for this assignment's scope.
 */
function isLikelyEnglish(text: string): boolean {
  if (!text) return false;
  const nonLatin = text.match(/[^\x00-\x7F]/g) || [];
  // If more than 15% of characters are non-ASCII, treat as non-English
  return nonLatin.length / text.length < 0.15;
}

/**
 * Walks backward through in_response_to_tweet_id chains to find the
 * root tweet of a conversation. Memoized so repeated lookups for
 * tweets in the same chain are instant.
 */
function findRoot(
  tweetId: string,
  parentMap: Map<string, string>,
  cache: Map<string, string>,
): string {
  // findRoot("102", parentMap, rootCache):
  if (cache.has(tweetId)) return cache.get(tweetId)!;

  const visited = new Set<string>();
  let current = tweetId;

  while (true) {
    if (visited.has(current)) break; // cycle guard
    visited.add(current);

    const parent = parentMap.get(current);
    if (!parent) break; // found root

    current = parent;
  }

  // Cache the result for every node we walked through, not just the start
  for (const node of visited) cache.set(node, current);
  return current; // 99
}

export async function prepareData(
  csvPath: string,
  options: DataPrepOptions,
): Promise<Conversation[]> {
  logger.step("Pass 1: Loading all rows and identifying brand tweets");

  const allTweets = new Map<string, RawTweet>();
  const brandTweetIds = new Set<string>();

  // this loop runs once per row, pulling rows off the conveyor belt one at a time.
  // Step 1: Your for await (const row of streamCsv(csvPath)) line starts running. This calls streamCsv(), which begins executing.

  // Step 2: Inside streamCsv, the CSV parser reads the first row from the file. The inner for await (const row of parser) gets that row, and hits:

  // yield row as RawTweet;
  // This pauses streamCsv right here, and sends that one row back out to your outer loop.

  // Step 3: Your outer loop receives that row (calls it row in your loop too — same name, different scope). It runs:
  for await (const row of streamCsv(csvPath)) {
    // yaha basically jo bhi row aa rha hai csv sa usko allTweets ma add krta jaa rha hai
    allTweets.set(row.tweet_id, row);
    if (row.author_id === options.brandAuthorId) {
      // Any tweet ka author_id match krgya humara bheja huwa brandAuthordId
      // toh ush tweet_id ko brandTweetId ma add krna hai
      // i.e. why below output dekh rha hai [ "269", "273", "275" ] because
      // ya authorId match krgya with our brandAuthordId
      brandTweetIds.add(row.tweet_id);
    }
  }

  // DEBUG: peek at first 3 entries of allTweets
  //   logger.step("DEBUG: First 3 entries in allTweets");
  // 1 => {
  //   tweet_id: "1",
  //   author_id: "sprintcare",
  //   inbound: "False",
  //   created_at: "Tue Oct 31 22:10:47 +0000 2017",
  //   text: "@115712 I understand. I would like to assist you. We would need to get you into a private secured link to further assist.",
  //   response_tweet_id: "2",
  //   in_response_to_tweet_id: "3",
  // }
  //   let count = 0;
  //   for (const [id, tweet] of allTweets) {
  //     if (count >= 3) break;
  //     console.log(id, "=>", tweet);
  //     count++;
  //   }

  // DEBUG: peek at first 3 entries of brandTweetIds
  //   logger.step("DEBUG: First 3 entries in brandTweetIds");
  //   console.log([...brandTweetIds].slice(0, 3)); // [ "269", "273", "275" ]

  //   logger.info(`Total tweets loaded: ${allTweets.size.toLocaleString()}`); //  2,811,774
  //   logger.info(
  //     `${options.brandAuthorId} tweets: ${brandTweetIds.size.toLocaleString()}`, // 169,840
  //   );

  logger.step("Pass 2: Building parent/child link map");

  // allTweet contain -> {1: {tweet_id:..., author_id:...}}
  // id = 1
  // tweet = {tweet_id:..., author_id:...}
  // Loop iteration 1 — id = "100", tweet = { tweet_id: "100", ..., in_response_to_tweet_id: "" }
  // Loop iteration 2 — id = "101", tweet = { tweet_id: "101", ..., in_response_to_tweet_id: "100" }
  // Now parentMap becomes: parentMap = Map { "101" => "100" }
  // 100 tweet ko 101 na reply diya tha
  // Loop iteration 3 — id = "102", tweet = { tweet_id: "102", ..., in_response_to_tweet_id: "101" }
  // parentMap = Map {  "101" => "100", "102" => "101" }
  // So here 100 is first tweet 101 first time replied to tweet then 102 replied to 101
  // in_response_to_tweet_id means ish  tweet ne kis tweet ka jawab diya hai
  const parentMap = new Map<string, string>();
  for (const [id, tweet] of allTweets) {
    if (tweet.in_response_to_tweet_id) {
      parentMap.set(id, tweet.in_response_to_tweet_id);
    }
  }

  logger.step("Pass 3: Expanding to find all connected tweets (BFS)");

  // brandTweetIds = Set { "269", "273", "275" }
  // AmazonHelp brandAuthorId ka saara tweet_id brandTweetIds ma aa gya hai
  let relatedIds = new Set<string>(brandTweetIds); // set {101}

  // Seed with direct parents and children
  for (const id of brandTweetIds) {
    // 101 ka allTweets ma tweet_id = 101 ka tweet mil gya
    const tweet = allTweets.get(id)!;
    // 101 na 100 ko response diya tha toh 100 ko relatedIds ma add krdo
    // relatedIds = Set {101, 100}
    if (tweet.in_response_to_tweet_id)
      relatedIds.add(tweet.in_response_to_tweet_id);
    // 101 tweet ko many children na reply kiya hoga for ex: 102, 103
    // relatedIds = Set {101, 100, 102, 103}
    for (const childId of parseIds(tweet.response_tweet_id))
      relatedIds.add(childId);
  }

  // Expand outward until no new tweets are found
  // relatedIds = Set {101, 100, 102, 103}
  // Let's also say tweet 100 itself has a parent — maybe it's a reply to an even earlier tweet 99:
  // This connection (99 → 100) was never discovered by the earlier 1-hop code, because that code only checked the direct parent/children of 101 and 150 — it never looked at what 100's own parent was. This is exactly the gap this new loop fixes.
  // yes aisa ho skta hai because 101 i know amazonHelp tweet but normal customer tweet we can find by amazon reply
  let frontier = new Set(relatedIds);
  while (frontier.size > 0) {
    const newIds = new Set<string>();

    for (const id of frontier) {
      // 100 ka tweet mil gya allTweets ma
      const tweet = allTweets.get(id);
      if (!tweet) continue;

      if (
        tweet.in_response_to_tweet_id &&
        !relatedIds.has(tweet.in_response_to_tweet_id)
      ) {
        // newIds = Set {99} because 100 ka parent 99 tha aur 99 na kisi ko reply nahi diya tha
        newIds.add(tweet.in_response_to_tweet_id);
      }
      // 99 ko 100 na reply diya tha toh 100 ka response_tweet_id = 99
      for (const childId of parseIds(tweet.response_tweet_id)) {
        if (!relatedIds.has(childId)) newIds.add(childId);
      }
    }

    // newIds = {99, 100}
    if (newIds.size === 0) break;
    // relatedIds = Set {101, 100, 102, 103, 99}
    for (const id of newIds) relatedIds.add(id);
    // frontier = Set {99, 100} because 100 ka parent 99 tha aur 99 na kisi ko reply nahi diya tha
    frontier = newIds;
  }

  logger.info(
    `Total related tweets found: ${relatedIds.size.toLocaleString()}`,
  );

  logger.step("Pass 4: Finding conversation roots and grouping");

  const rootCache = new Map<string, string>();
  const groupedByRoot = new Map<string, RawTweet[]>();
  // relatedIds = Set { "99", "100", "101", "102" }
  // parentMap = Map { "100" => "99", "101" => "100", "102" => "101" }
  for (const id of relatedIds) {
    const tweet = allTweets.get(id);
    if (!tweet) continue;
    // findRoot() — walking backward to find the start of a conversation
    const rootId = findRoot(id, parentMap, rootCache);
    // map{ 99, [] }
    if (!groupedByRoot.has(rootId)) groupedByRoot.set(rootId, []);
    // groupedByRoot = Map {"99" => [tweet99, tweet100, tweet101, tweet102] }
    groupedByRoot.get(rootId)!.push(tweet);
  }

  logger.info(
    `Conversation threads found: ${groupedByRoot.size.toLocaleString()}`,
  );

  logger.step("Pass 5: Building conversation objects + quality filtering");

  const conversations: Conversation[] = [];

  for (const [rootId, group] of groupedByRoot) {
    const hasBrand = group.some((t) => t.author_id === options.brandAuthorId);
    const hasCustomer = group.some(
      (t) => t.author_id !== options.brandAuthorId,
    );
    if (!hasBrand || !hasCustomer) continue;

    const sorted = [...group].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const conversationLines: string[] = [];
    const customerLines: string[] = [];
    const brandLines: string[] = [];

    for (const row of sorted) {
      const speaker =
        row.author_id === options.brandAuthorId
          ? options.brandAuthorId
          : "Customer";
      if (row.text) conversationLines.push(`${speaker}: ${row.text}`);

      if (row.author_id === options.brandAuthorId) {
        if (row.text) brandLines.push(row.text);
      } else {
        if (row.text) customerLines.push(row.text);
      }
    }

    const customerProblem = customerLines.join("\n").trim();
    const brandResponses = brandLines.join("\n").trim();
    const turnCount = sorted.length;

    // Quality gates
    if (!customerProblem || !brandResponses) continue;
    if (turnCount < options.minTurns || turnCount > options.maxTurns) continue;
    if (options.englishOnly && !isLikelyEnglish(customerProblem)) continue;

    conversations.push({
      conversation_id: rootId,
      conversation: conversationLines.join("\n"),
      customer_problem: customerProblem,
      brand_responses: brandResponses,
      turn_count: turnCount,
      customer_turns: sorted.filter(
        (t) => t.author_id !== options.brandAuthorId,
      ).length,
      first_timestamp: sorted[0]!.created_at,
      last_timestamp: sorted[sorted.length - 1]!.created_at,
    });
  }

  logger.info(
    `Final clean conversations: ${conversations.length.toLocaleString()}`,
  );

  return conversations;
}
