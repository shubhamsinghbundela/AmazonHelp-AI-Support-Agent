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
