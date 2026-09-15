import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import type { EvalResult } from "./evaluation.types";

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let currentSeed = seed;
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

async function main() {
  const resultsPath = path.join(
    process.cwd(),
    "golden-set/eval-results-detailed.json",
  );
  const results: EvalResult[] = JSON.parse(readFileSync(resultsPath, "utf-8"));

  const shuffled = seededShuffle(results, 7);
  //Randomly pick 50 out of my 219 evaluated examples, but do it in a way that gives me the SAME 50 every time I run this script
  const sample = shuffled.slice(0, 50);

  const template = sample.map((r) => ({
    conversation_id: r.conversation_id,
    customer_message: r.customer_message,
    predicted_reply: r.predicted_reply,
    human_score: null, // YOU fill this: 1-5
  }));

  mkdirSync(path.join(process.cwd(), "golden-set"), { recursive: true });
  const outputPath = path.join(
    process.cwd(),
    "golden-set/human-review-sample.json",
  );
  writeFileSync(outputPath, JSON.stringify(template, null, 2));

  console.log(`✅ Saved ${template.length} samples to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
