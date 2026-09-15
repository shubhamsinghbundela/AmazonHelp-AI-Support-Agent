/**
 * Two intentionally simple comparison systems, used to prove that the
 * full RAG + LLM agent's accuracy is actually earning its complexity,
 * not just getting lucky the way a naive approach might.
 */

import { FORCE_ESCALATE_INTENTS } from "../agent/agent.escalationRules.config";
import type { IntentType } from "../intent/intents.config";
import type { GoldenExample } from "./evaluation.types";

export interface BaselinePrediction {
  intent: string;
  decision: "AUTO_HANDLE" | "ESCALATE";
}

/**
 * Trivial baseline: always guesses the single most common intent and
 * decision found in the golden set, without reading the message at all.
 * This is the "laziest possible" comparison point.
 */
export function buildTrivialBaseline(
  goldenExamples: GoldenExample[],
): () => BaselinePrediction {
  const intentCounts = new Map<string, number>();
  const decisionCounts = new Map<string, number>();

  for (const ex of goldenExamples) {
    //DELIVERY_ISSUE: 91
    intentCounts.set(
      ex.correct_intent,
      (intentCounts.get(ex.correct_intent) || 0) + 1,
    );
    //AUTO_HANDLE: 208
    decisionCounts.set(
      ex.correct_decision,
      (decisionCounts.get(ex.correct_decision) || 0) + 1,
    );
  }

  const mostCommonIntent = [...intentCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]![0];
  const mostCommonDecision = [...decisionCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]![0] as "AUTO_HANDLE" | "ESCALATE";

  // Return a function that ignores its input entirely
  return () => ({ intent: mostCommonIntent, decision: mostCommonDecision });
}

/**
 * Simple baseline: basic keyword matching, no AI. Checks the message
 * for characteristic words per intent category and returns the first
 * match. Falls back to OTHER if nothing matches.
 */
const KEYWORD_RULES: Array<{ intent: IntentType; keywords: RegExp }> = [
  {
    intent: "BILLING_ISSUE",
    keywords: /charge|billing|overcharged|duplicate.*payment/i,
  },
  {
    intent: "ACCOUNT_ISSUE",
    keywords: /log.?in|password|account.*(lock|clos)/i,
  },
  { intent: "RETURN_REPLACEMENT_REFUND", keywords: /return|replace|refund/i },
  {
    intent: "WRONG_ITEM",
    keywords: /wrong item|wrong (color|size)|not what i ordered/i,
  },
  {
    intent: "PACKAGING_ISSUE",
    keywords: /damaged|broken box|crushed|packaging/i,
  },
  {
    intent: "PRODUCT_ISSUE",
    keywords: /defective|stopped working|doesn't work|poor quality/i,
  },
  {
    intent: "WEBSITE_ISSUE",
    keywords: /app (crash|bug)|website.*(broken|error)|checkout.*error/i,
  },
  {
    intent: "DELIVERY_ISSUE",
    keywords: /late|delay|hasn'?t arrived|not (arrived|delivered)|tracking/i,
  },
  {
    intent: "SERVICE_COMPLAINT",
    keywords: /worst|rude|terrible service|unhelpful/i,
  },
  {
    intent: "POSITIVE_FEEDBACK",
    keywords: /thank|great|love|awesome|amazing/i,
  },
  { intent: "GENERAL_QUESTION", keywords: /how do i|is there|can i|do you/i },
];

export function simpleBaseline(message: string): BaselinePrediction {
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.test(message)) {
      const decision = FORCE_ESCALATE_INTENTS.includes(rule.intent)
        ? "ESCALATE"
        : "AUTO_HANDLE";
      return { intent: rule.intent, decision };
    }
  }
  return { intent: "OTHER", decision: "AUTO_HANDLE" };
}
