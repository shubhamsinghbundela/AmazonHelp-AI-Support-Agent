/**
 * One-time setup script: builds the searchable knowledge base.
 *
 * The original dataset had 2.8 million tweets. Day 1's data-prep
 * pipeline cleaned that down to ~82,000 real AmazonHelp conversations.
 * This script takes a subsample of those (~20,000 conversations) and
 * converts each one into a vector using Voyage's embedding API, then
 * stores those vectors in Pinecone so they can be searched later.
 *
 * Only the customer's message gets embedded (not the full conversation),
 * because that's what we'll be comparing against later — a brand new
 * customer message, with no resolution yet.
 *
 * Run with: bun run retrieval:index
 */
import { handleCustomerMessage } from "./agent.service";

async function main() {
  const testMessage = process.argv[2];

  if (!testMessage) {
    console.error('Usage: bun run agent:test "your message here"');
    process.exit(1);
  }

  const result = await handleCustomerMessage(testMessage);

  console.log("\n=== Agent Response ===");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
