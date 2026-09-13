import { embedBatch } from "../retrieval/embedding.service";
import { queryTopK } from "../retrieval/pinecone.service";
import { callAgentModel } from "./openai.service";
import { INTENTS } from "../intent/intents.config";
import { FORCE_ESCALATE_INTENTS } from "./escalationRules.config";
import { logger } from "../../common/utils/logger";
import type { AgentResponse } from "./agent.types";

function buildPrompt(
  message: string,
  similarCases: Array<{
    metadata: { customer_problem: string; brand_responses: string };
  }>,
): string {
  const intentList = INTENTS.map((i) => `- ${i.id}: ${i.description}`).join(
    "\n",
  );

  const examples = similarCases
    .map(
      (c, i) => `
        Example ${i + 1}:
        Customer: ${c.metadata.customer_problem}
        Support Agent Resolution: ${c.metadata.brand_responses}`,
    )
    .join("\n");

  return `You are an AI customer support agent for Amazon. Analyze the new customer message below and respond with a JSON object.
    Available intent categories: ${intentList}
    Here are similar past cases and how they were resolved: ${examples}
    New customer message: "${message}"

    Instructions:
    1. Classify the message into exactly ONE of the intent categories above (use the exact id).
    2. Draft a reply grounded in the tone and approach shown in the similar past cases above. Do not invent policies not shown in the examples.
    3. Decide whether this should be AUTO_HANDLE (a human doesn't need to review) or ESCALATE (needs human review — e.g. billing disputes, account security, anything requiring identity verification or that could not be resolved with a standard templated response).
    4. Give a brief reason for your decision.
    
    Respond ONLY with valid JSON in this exact shape:
    {
      "intent": "<one of the intent ids above>",
      "reply": "<your drafted reply>",
      "decision": "AUTO_HANDLE" or "ESCALATE",
      "reason": "<brief explanation>"
    }`;
}

export async function handleCustomerMessage(
  message: string,
): Promise<AgentResponse> {
  logger.step(`Handling message: "${message}"`);

  // Step 1: Embed the new message
  const [queryVector] = await embedBatch([message]);
  if (!queryVector) {
    throw new Error("Failed to embed customer message");
  }

  // Step 2: Retrieve similar past conversations
  const similarCases = await queryTopK(queryVector, 5);
  logger.info(`Retrieved ${similarCases.length} similar past cases`);

  // Step 3: Build the prompt and call the model
  const prompt = buildPrompt(message, similarCases);
  const rawResponse = await callAgentModel(prompt);

  // Step 4: Parse the JSON response
  let parsed: AgentResponse;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (err) {
    throw new Error(`Failed to parse model response as JSON: ${rawResponse}`);
  }

  // Step 5: Apply safety-net escalation rules on top of model judgment
  if (FORCE_ESCALATE_INTENTS.includes(parsed.intent)) {
    parsed.decision = "ESCALATE";
    parsed.reason = `${parsed.reason} (Force-escalated: ${parsed.intent} always requires human review.)`;
  }

  return parsed;
}
