import type { IntentType } from "../intent/intents.config";

/**
 * Intents that should ALWAYS escalate to a human, regardless of what
 * the LLM decides — a safety net on top of model judgment.
 * Rationale: billing and account-access issues often require identity
 * verification or account changes the AI cannot safely perform.
 */
export const FORCE_ESCALATE_INTENTS: IntentType[] = [
  "BILLING_ISSUE",
  "ACCOUNT_ACCESS",
];
