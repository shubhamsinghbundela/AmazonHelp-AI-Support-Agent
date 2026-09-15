/**
 * Samples candidate conversations for the golden evaluation set.
 *
 * This script ONLY selects real customer messages from the held-out
 * pool. It does NOT assign intent/decision labels — those fields
 * are left empty in the output and must be filled in manually by a
 * human, per the assignment's requirement to hand-label real data
 * rather than auto-generate ground truth.
 */

import path from "path";
import type { Conversation } from "../../common/types/tweet.types";
import { readFileSync, writeFileSync } from "fs";
import { logger } from "../../common/utils/logger";

const TARGET_SAMPLE_SIZE = 220; // aim slightly above 200 to allow dropping bad ones during review

//I shuffle my data randomly, but in a way that gives the SAME shuffle every time I run it — so anyone can reproduce my exact golden set
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let currentSeed = seed;

  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    // We KNOW these indices are always valid (i and j are within bounds
    // by construction), so it's safe to assert non-null here.
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }

  return result;
}

async function main() {
  const allConversationsPath = path.join(
    process.cwd(),
    "data/processed/amazon-conversations.json",
  );

  const indexedIdsPath = path.join(
    process.cwd(),
    "data/processed/indexed-ids.json",
  );

  const allConversations: Conversation[] = JSON.parse(
    readFileSync(allConversationsPath, "utf-8"),
  );

  const indexedIds: string[] = JSON.parse(
    readFileSync(indexedIdsPath, "utf-8"),
  );

  const indexedIdSet = new Set(indexedIds);

  logger.info(`Total conversations: ${allConversations.length}`);
  logger.info(`Indexed (excluded): ${indexedIdSet.size}`);

  // Held-out pool: conversations NEVER shown to the retrieval index
  const heldOutPool = allConversations.filter(
    (c) => !indexedIdSet.has(c.conversation_id),
  );

  logger.info(`Held-out pool available: ${heldOutPool.length}`);

  // Random sample using a fixed seed for reproducibility
  const shuffled = seededShuffle(heldOutPool, 42);
  const candidates = shuffled.slice(0, TARGET_SAMPLE_SIZE);

  // Output a template you'll manually fill in with labels
  const template = candidates.map((c) => ({
    conversation_id: c.conversation_id,
    customer_message: c.customer_problem,
    // You fill these in manually:
    correct_intent: "",
    correct_decision: "", // "AUTO_HANDLE" or "ESCALATE"
    expected_reply_criteria: "", // brief note on what a good reply should cover
  }));

  const outputPath = path.join(
    process.cwd(),
    "golden-set/golden-candidates.json",
  );
  writeFileSync(outputPath, JSON.stringify(template, null, 2));

  logger.info(` Saved ${template.length} candidates to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
