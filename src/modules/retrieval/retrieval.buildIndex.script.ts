import { readFileSync } from "fs";
import path from "path";
import type { Conversation } from "../../common/types/tweet.types";
import { embedBatch, chunkArray, sleep } from "./retrieval.embedding.service";
import { upsertBatch, type VectorRecord } from "./retrieval.pinecone.service";
import { logger } from "../../common/utils/logger";

const BATCH_SIZE = 50; // texts per Voyage API call
const SAMPLE_SIZE = 20000; // how many conversations to embed (adjust as needed)

async function main() {
  const jsonPath = path.join(
    process.cwd(),
    "data/processed/amazon-conversations.json",
  );

  const allConversations: Conversation[] = JSON.parse(
    readFileSync(jsonPath, "utf-8"),
  );

  logger.info(`Total conversations available: ${allConversations.length}`);

  // Take a sample (or all, if SAMPLE_SIZE >= total)
  const conversations = allConversations.slice(0, SAMPLE_SIZE);
  logger.info(`Embedding ${conversations.length} conversations`);

  //Voyage's API has limits on how much text you can send in ONE request:
  // You cannot send all 20,000 conversations in a single API call. If you tried:
  //This splits your 20,000 conversations into manageable groups:

  // 20,000 conversations ÷ 50 per batch = 400 batches

  // Batch 1: conversations[0-49]     → send to Voyage → get 50 vectors back
  // Batch 2: conversations[50-99]    → send to Voyage → get 50 vectors back
  // Batch 3: conversations[100-149]  → send to Voyage → get 50 vectors back
  // ...
  // Batch 400: conversations[19950-19999] → send to Voyage → get 50 vectors back
  const batches = chunkArray(conversations, BATCH_SIZE);
  logger.info(`Split into ${batches.length} batches of ${BATCH_SIZE}`);

  let processedCount = 0;

  for (const [batchIndex, batch] of batches.entries()) {
    // The new input you'll receive at runtime is always just the customer's message
    const texts = batch.map((c) => c.customer_problem);

    logger.step(`Embedding batch ${batchIndex + 1}/${batches.length}`);
    const embeddings = await embedBatch(texts);

    // Safety check: if Voyage returned a different number of embeddings
    // than texts we sent, something went wrong — fail loudly instead of
    // silently creating broken records with missing vectors
    if (embeddings.length !== batch.length) {
      throw new Error(
        `Mismatch: sent ${batch.length} texts but got ${embeddings.length} embeddings back`,
      );
    }

    const records: VectorRecord[] = batch.map((conv, i) => {
      const embedding = embeddings[i];

      // This check is what actually satisfies TypeScript —
      // inside this `if`, TypeScript now KNOWS embedding is number[], not undefined
      if (!embedding) {
        throw new Error(
          `Missing embedding for conversation ${conv.conversation_id}`,
        );
      }

      //Without metadata, a query would only return:
      // { id: "1234567", score: 0.94 }
      // { id: "2345678", score: 0.91 }
      // With metadata, a query directly returns:
      // {
      //   id: "1234567",
      //   score: 0.94,
      //   metadata: {
      //     customer_problem: "My package hasn't arrived yet",
      //     brand_responses: "Sorry! Please DM your order number...",
      //     turn_count: 3
      //   }
      // }
      // In one sentence: Metadata is stored so that when Pinecone returns a similarity match, you get the actual useful text (customer_problem, brand_responses) bundled with it — avoiding a separate lookup step and making the retrieved result immediately usable in your Claude prompt.
      return {
        id: conv.conversation_id,
        values: embedding, // ✅ no more type error, TypeScript is now sure this is number[]
        metadata: {
          customer_problem: conv.customer_problem.slice(0, 1000),
          brand_responses: conv.brand_responses.slice(0, 1000),
          turn_count: conv.turn_count,
        },
      };
    });

    await upsertBatch(records);

    processedCount += batch.length;
    logger.info(`Progress: ${processedCount}/${conversations.length} uploaded`);

    // Small delay to be safe with rate limits, even with payment method added
    await sleep(200);
  }

  logger.info(`✅ Done! ${processedCount} conversations indexed in Pinecone`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
