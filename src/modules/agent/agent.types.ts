import type { IntentType } from "../intent/intents.config";

export type Decision = "AUTO_HANDLE" | "ESCALATE";

export interface AgentResponse {
  intent: IntentType;
  reply: string;
  decision: Decision;
  reason: string;
}
