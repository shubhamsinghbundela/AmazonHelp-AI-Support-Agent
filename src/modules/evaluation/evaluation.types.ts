export interface GoldenExample {
  conversation_id: string;
  customer_message: string;
  correct_intent: string;
  correct_decision: string;
  expected_reply_criteria: string;
}

export interface EvalResult {
  conversation_id: string; // // ← just an ID reference, not a judgment
  customer_message: string; // ← real text from the dataset (not human-judged, just the input)
  correct_intent: string; // ← YOU wrote this manually
  predicted_intent: string; // ← AI's guess at the intent
  intent_correct: boolean; // ← true if correct_intent === predicted_intent
  correct_decision: string; // ← YOU wrote this manually
  predicted_decision: string; // ← AI's AUTO_HANDLE/ESCALATE call
  decision_correct: boolean; // ← true if correct_decision === predicted_decision
  predicted_reply: string; // ← AI's drafted reply text
  predicted_reason: string; // ← AI's explanation for its decision
  error?: string; // ← only filled if something crashed during that example
}

export interface EvalSummary {
  total_examples: number; // How many golden examples were actually evaluated.
  intent_accuracy: number; // Overall percentage of examples where predicted_intent matched correct_intent.
  decision_accuracy: number; // Overall percentage of examples where predicted_decision matched correct_decision.
  errors: number;
}
