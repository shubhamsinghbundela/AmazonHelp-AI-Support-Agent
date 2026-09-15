/**
 * Validates whether the LLM-as-judge can be trusted to score reply
 * quality automatically, by comparing it against human judgment.
 *
 * Reads the 50 replies sampled by
 * evaluation.sampleForHumanReview.script.ts (which a human has already
 * scored 1-5 in the human_score field), then scores those SAME 50
 * replies using an LLM judge against a fixed rubric (issue-specificity,
 * grounding in retrieved context, appropriate next step, tone).
 *
 * Computes agreement between human and LLM scores:
 *   - exact_match: LLM score === human score
 *   - within_one: |LLM score - human score| <= 1 (standard tolerance
 *     for subjective 1-5 quality ratings)
 *
 * This agreement percentage is the required evidence that the LLM
 * judge is reliable enough to use for grading reply quality at scale,
 * without a human reading every single reply.
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { judgeReply } from "./evaluation.llmReplyQualityJudge.service";
import { logger } from "../../common/utils/logger";

interface HumanReviewEntry {
  conversation_id: string;
  customer_message: string;
  predicted_reply: string;
  human_score: number | null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const inputPath = path.join(
    process.cwd(),
    "golden-set/human-review-sample.json",
  );
  const entries: HumanReviewEntry[] = JSON.parse(
    readFileSync(inputPath, "utf-8"),
  );

  const scoredEntries = entries.filter((e) => e.human_score !== null);
  logger.info(`Total entries: ${entries.length}`);
  logger.info(`Human-scored entries: ${scoredEntries.length}`);

  const results = [];

  for (const [index, entry] of scoredEntries.entries()) {
    logger.step(
      `[${index + 1}/${scoredEntries.length}] ${entry.conversation_id}`,
    );

    const judgeResult = await judgeReply({
      customer_message: entry.customer_message,
      predicted_reply: entry.predicted_reply,
    });

    const humanScore = entry.human_score!;
    const llmScore = judgeResult.score;
    const diff = Math.abs(humanScore - llmScore);

    results.push({
      conversation_id: entry.conversation_id,
      customer_message: entry.customer_message,
      predicted_reply: entry.predicted_reply,
      human_score: humanScore,
      llm_score: llmScore,
      llm_reasoning: judgeResult.reasoning,
      exact_match: diff === 0,
      within_one: diff <= 1,
    });

    await sleep(300);
  }

  // --- Compute agreement metrics ---
  const exactMatchCount = results.filter((r) => r.exact_match).length;
  const withinOneCount = results.filter((r) => r.within_one).length;

  const exactAgreementPct = (exactMatchCount / results.length) * 100;
  const withinOneAgreementPct = (withinOneCount / results.length) * 100;

  // Average absolute difference (how far off, on average)
  const avgDiff =
    results.reduce((sum, r) => sum + Math.abs(r.human_score - r.llm_score), 0) /
    results.length;

  const summary = {
    total_scored: results.length,
    exact_agreement_pct: exactAgreementPct,
    within_one_agreement_pct: withinOneAgreementPct,
    average_score_difference: avgDiff,
  };

  writeFileSync(
    path.join(process.cwd(), "golden-set/llm-judge-detailed.json"),
    JSON.stringify(results, null, 2),
  );
  writeFileSync(
    path.join(process.cwd(), "golden-set/llm-judge-summary.json"),
    JSON.stringify(summary, null, 2),
  );

  logger.step("=== LLM JUDGE AGREEMENT SUMMARY ===");
  console.log(`Total scored: ${summary.total_scored}`);
  console.log(`Exact agreement: ${exactAgreementPct.toFixed(1)}%`);
  console.log(`Within-1-point agreement: ${withinOneAgreementPct.toFixed(1)}%`);
  console.log(`Average score difference: ${avgDiff.toFixed(2)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
