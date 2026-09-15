import OpenAI from "openai";
import { env } from "../../common/config/env";
import { logger } from "../../common/utils/logger";

const openai = new OpenAI({ apiKey: env.openaiApiKey });

/**
 * Calls OpenAI with a prompt and expects a JSON response back.
 * Uses response_format to force valid JSON output, avoiding
 * the need to parse loosely-formatted text.
 */
export async function callAgentModel(prompt: string): Promise<string> {
  logger.info("Calling OpenAI...");

  // Create a new chat completion — here's the conversation so far (just one user message), now generate what the assistant would say next
  // Since the API is stateless (doesn't remember past calls), you have to resend the entire conversation history every time, and it "completes" by generating the next assistant message based on everything before it.
  // For YOUR project specifically: you're only ever sending ONE message per call (role: "user", content: prompt) — no conversation history needed, since each customer support message is handled independently. That's why your code is simple:
  const response = await openai.chat.completions.create({
    model: env.openaiModel,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  logger.info("OpenAI response received");
  return content;
}
