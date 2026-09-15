/**
 * Evaluates two simple baselines (trivial and keyword-based) against
 * the same golden set used for the main agent, and prints a comparison
 * table. Required deliverable: "Results vs. at least two baselines."
 */

import { readFileSync } from "fs";
import path from "path";
import type { GoldenExample } from "./evaluation.types";
import {
  buildTrivialBaseline,
  simpleBaseline,
} from "./evaluation.baselines.service";
import { logger } from "../../common/utils/logger";

function main() {
  const goldenSetPath = path.join(
    process.cwd(),
    "golden-set/golden-candidates.json",
  );
  const goldenExamples: GoldenExample[] = JSON.parse(
    readFileSync(goldenSetPath, "utf-8"),
  );
  const labeled = goldenExamples.filter(
    (ex) => ex.correct_intent && ex.correct_decision,
  );

  const trivialPredict = buildTrivialBaseline(labeled);

  let trivialIntentCorrect = 0;
  let trivialDecisionCorrect = 0;
  let simpleIntentCorrect = 0;
  let simpleDecisionCorrect = 0;

  for (const ex of labeled) {
    const trivial = trivialPredict();
    if (trivial.intent === ex.correct_intent) trivialIntentCorrect++;
    if (trivial.decision === ex.correct_decision) trivialDecisionCorrect++;

    const simple = simpleBaseline(ex.customer_message);
    if (simple.intent === ex.correct_intent) simpleIntentCorrect++;
    if (simple.decision === ex.correct_decision) simpleDecisionCorrect++;
  }

  const total = labeled.length;

  // Pull the agent's already-computed numbers for a full comparison table
  let agentIntentAcc = "N/A";
  let agentDecisionAcc = "N/A";

  try {
    const summaryPath = path.join(
      process.cwd(),
      "golden-set/intent-eval-summary.json",
    );
    const summary = JSON.parse(readFileSync(summaryPath, "utf-8"));
    agentIntentAcc = (summary.intent_accuracy * 100).toFixed(1) + "%";
    agentDecisionAcc = (summary.decision_accuracy * 100).toFixed(1) + "%";
  } catch {
    logger.warn(
      "Could not load eval-summary.json — run eval:intent first for full comparison",
    );
  }

  logger.step("=== BASELINE COMPARISON ===");
  console.log(`Total examples: ${total}\n`);

  // Print a simple table header
  console.log("System            | Intent Accuracy | Decision Accuracy");
  console.log("-------------------|------------------|-------------------");

  // Row 1: how the "always guess the same answer" baseline did
  console.log(
    `Trivial baseline   | ${((trivialIntentCorrect / total) * 100).toFixed(1)}%            | ${((trivialDecisionCorrect / total) * 100).toFixed(1)}%`,
  );

  // Row 2: how the basic keyword-matching baseline did
  console.log(
    `Simple (keyword)   | ${((simpleIntentCorrect / total) * 100).toFixed(1)}%            | ${((simpleDecisionCorrect / total) * 100).toFixed(1)}%`,
  );

  // Row 3: how the actual AI agent did (numbers pulled from the earlier eval run)
  console.log(
    `AI Agent           | ${agentIntentAcc}            | ${agentDecisionAcc}`,
  );
}

main();
