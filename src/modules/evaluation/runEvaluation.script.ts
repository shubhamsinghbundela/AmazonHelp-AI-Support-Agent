import type {
  EvalResult,
  EvalSummary,
  GoldenExample,
} from "./evaluation.types";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { logger } from "../../common/utils/logger";
import { handleCustomerMessage } from "../agent/agent.service";
import { sleep } from "../retrieval/embedding.service";
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
      `[${index + 1}/${labeledExamples.length}] ${example.conversation_id}`,
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

  const perIntentAccuracy: EvalSummary["per_intent_accuracy"] = {};
  const confusionMatrix: EvalSummary["confusion_matrix"] = {};

  for (const r of results) {
    // Per-intent accuracy
    if (!perIntentAccuracy[r.correct_intent]) {
      perIntentAccuracy[r.correct_intent] = {
        correct: 0,
        total: 0,
        accuracy: 0,
      };
    }

    perIntentAccuracy[r.correct_intent]!.total += 1;
    if (r.intent_correct) perIntentAccuracy[r.correct_intent]!.correct += 1;

    // Confusion matrix: actual -> predicted -> count
    if (!confusionMatrix[r.correct_intent]) {
      confusionMatrix[r.correct_intent] = {};
    }
    confusionMatrix[r.correct_intent]![r.predicted_intent] =
      (confusionMatrix[r.correct_intent]![r.predicted_intent] || 0) + 1;
  }

  for (const intent in perIntentAccuracy) {
    const stats = perIntentAccuracy[intent];
    stats!.accuracy = stats!.total > 0 ? stats!.correct / stats!.total : 0;
  }

  const summary: EvalSummary = {
    total_examples: results.length,
    intent_accuracy: intentCorrectCount / results.length,
    decision_accuracy: decisionCorrectCount / results.length,
    per_intent_accuracy: perIntentAccuracy,
    confusion_matrix: confusionMatrix,
    errors: errorCount,
  };

  // --- Save both detailed results and summary ---
  const resultsPath = path.join(
    process.cwd(),
    "golden-set/eval-results-detailed.json",
  );
  const summaryPath = path.join(process.cwd(), "golden-set/eval-summary.json");

  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  logger.step("=== EVALUATION SUMMARY ===");
  console.log(`Total examples: ${summary.total_examples}`);
  console.log(
    `Intent accuracy: ${(summary.intent_accuracy * 100).toFixed(1)}%`,
  );
  console.log(
    `Decision accuracy: ${(summary.decision_accuracy * 100).toFixed(1)}%`,
  );
  console.log(`Errors: ${summary.errors}`);
  console.log(`\nPer-intent accuracy:`);
  for (const [intent, stats] of Object.entries(summary.per_intent_accuracy)) {
    console.log(
      `  ${intent}: ${(stats.accuracy * 100).toFixed(1)}% (${stats.correct}/${stats.total})`,
    );
  }

  logger.info(`\n✅ Detailed results saved to ${resultsPath}`);
  logger.info(`✅ Summary saved to ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
