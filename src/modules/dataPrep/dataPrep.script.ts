/**
 * Entry point for the data preparation pipeline.
 *
 * Reads the raw Twitter customer-support CSV (~2.8M tweets across many
 * brands), filters to a single brand (AmazonHelp), reconstructs full
 * conversation threads from the reply-chain structure (see
 * dataPrep.service.ts for the BFS thread-reconstruction and root-finding
 * logic), applies quality filters (English-only, turn-count bounds to
 * exclude outlier threads), and writes the result as clean, structured
 * JSON conversations.
 *
 * Output: data/processed/amazon-conversations.json — one entry per
 * conversation, with the full transcript plus separate customer-only
 * and brand-only text fields. This file is the input for all downstream
 * work: intent taxonomy definition, embedding/indexing, and golden set
 * sampling.
 *
 * Run with: bun run data:prepare
 */

import { writeFileSync } from "fs";
import path from "path";
import { prepareData } from "./dataPrep.service";
import { logger } from "../../common/utils/logger";

async function main() {
  const csvPath = path.join(process.cwd(), "data/raw/twcs.csv/twcs.csv");
  const outputPath = path.join(
    process.cwd(),
    "data/processed/amazon-conversations.json",
  );

  const conversations = await prepareData(csvPath, {
    brandAuthorId: "AmazonHelp",
    minTurns: 2,
    maxTurns: 20,
    englishOnly: true,
  });

  writeFileSync(outputPath, JSON.stringify(conversations, null, 2));
  logger.info(`Saved to ${outputPath}`);

  // Print a few samples so you can eyeball quality
  logger.step("Sample conversations:");
  for (const c of conversations.slice(0, 3)) {
    console.log("---");
    console.log(c.conversation);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
