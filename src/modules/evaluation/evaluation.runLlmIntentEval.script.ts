/**
 * Runs the full agent pipeline (embed → retrieve → classify → decide)
 * against every labeled example in the golden set, and compares the
 * agent's predictions to the human-assigned ground truth.
 *
 * For each golden example, checks:
 *   - intent_correct: does predicted_intent match correct_intent?
 *   - decision_correct: does predicted_decision match correct_decision?
 *
 * Produces two outputs:
 *   - eval-results-detailed.json: per-example predictions vs. ground
 *     truth, used later for failure analysis
 *   - eval-summary.json: aggregate metrics — overall intent accuracy,
 *     decision accuracy, per-intent accuracy breakdown, and a confusion
 *     matrix showing which intents get mistaken for which
 *
 * This produces the assignment's core "automated metrics" deliverable
 * (headline intent/decision accuracy numbers).
 */
import type {
  EvalResult,
  EvalSummary,
  GoldenExample,
} from "./evaluation.types";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { logger } from "../../common/utils/logger";
import { handleCustomerMessage } from "../agent/agent.service";
import { sleep } from "../retrieval/retrieval.embedding.service";
async function main() {
  const goldenSetPath = path.join(
    process.cwd(),
    "golden-set/golden-candidates.json",
  );
  const goldenExamples: GoldenExample[] = JSON.parse(
    readFileSync(goldenSetPath, "utf-8"),
  );

  // Only evaluate examples that were actually labeled (skip any left blank)
  const labeledExamples = goldenExamples.filter(
    (ex) => ex.correct_intent && ex.correct_decision,
  );

  logger.info(`Total golden examples: ${goldenExamples.length}`);
  logger.info(`Labeled examples to evaluate: ${labeledExamples.length}`);

  const results: EvalResult[] = [];

  for (const [index, example] of labeledExamples.entries()) {
    logger.step(
      `[${index + 1}/${labeledExamples.length}] - ConversationId: ${example.conversation_id}`,
    );

    try {
      const agentResponse = await handleCustomerMessage(
        example.customer_message,
      );
      results.push({
        conversation_id: example.conversation_id,
        customer_message: example.customer_message,
        correct_intent: example.correct_intent,
        predicted_intent: agentResponse.intent,
        intent_correct: agentResponse.intent === example.correct_intent,
        correct_decision: example.correct_decision,
        predicted_decision: agentResponse.decision,
        decision_correct: agentResponse.decision === example.correct_decision,
        predicted_reply: agentResponse.reply,
        predicted_reason: agentResponse.reason,
      });
    } catch (err) {
      logger.error(`Failed on ${example.conversation_id}:`, err);
      results.push({
        conversation_id: example.conversation_id,
        customer_message: example.customer_message,
        correct_intent: example.correct_intent,
        predicted_intent: "ERROR",
        intent_correct: false,
        correct_decision: example.correct_decision,
        predicted_decision: "ERROR",
        decision_correct: false,
        predicted_reply: "",
        predicted_reason: "",
        error: String(err),
      });
    }

    // Small delay to be gentle on rate limits across ~200 calls
    await sleep(300);
  }

  // --- Compute summary metrics ---
  const intentCorrectCount = results.filter((r) => r.intent_correct).length;
  const decisionCorrectCount = results.filter((r) => r.decision_correct).length;
  const errorCount = results.filter((r) => r.error).length;

  const summary: EvalSummary = {
    total_examples: results.length,
    intent_accuracy: intentCorrectCount / results.length,
    decision_accuracy: decisionCorrectCount / results.length,
    errors: errorCount,
  };

  // --- Save both detailed results and summary ---
  const resultsPath = path.join(
    process.cwd(),
    "golden-set/intent-eval-results-detailed.json",
  );
  const summaryPath = path.join(
    process.cwd(),
    "golden-set/intent-eval-summary.json",
  );

  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  logger.step("=== INTENT EVALUATION SUMMARY ===");
  console.log(`Total examples: ${summary.total_examples}`);
  console.log(
    `Intent accuracy: ${(summary.intent_accuracy * 100).toFixed(1)}%`,
  );
  console.log(
    `Decision accuracy: ${(summary.decision_accuracy * 100).toFixed(1)}%`,
  );
  console.log(`Errors: ${summary.errors}`);

  logger.info(`\n Detailed results saved to ${resultsPath}`);
  logger.info(` Summary saved to ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
