import { callAgentModel } from "../agent/agent.openai.service";
import { logger } from "../../common/utils/logger";

interface JudgeInput {
  customer_message: string;
  predicted_reply: string;
}

interface JudgeOutput {
  score: number;
  reasoning: string;
}

const RUBRIC = `Score the support agent's reply on a scale of 1-5 based on:
1. Does it address the specific issue mentioned in the customer's message?
2. Does it take an appropriate next step — for complaints or problems, this
   means asking for info, offering a resolution, or directing to the proper
   channel; for positive feedback or simple acknowledgments, a warm response
   with no next step is entirely appropriate and should NOT be penalized.

Scoring guide:
5 = Excellent: directly addresses the message, specific, professional, and
    takes the right action for the situation (including "no action needed"
    when the message doesn't call for one)
4 = Good: addresses the issue well, minor room for improvement
3 = Adequate: generic but not wrong, doesn't fully address specifics
2 = Poor: misses the point, too generic, or awkward
1 = Bad: irrelevant, hallucinated, or actively unhelpful`;

export async function judgeReply(input: JudgeInput): Promise<JudgeOutput> {
  const prompt = `${RUBRIC}

Customer message: "${input.customer_message}"
Agent's reply: "${input.predicted_reply}"

Respond ONLY with valid JSON in this exact shape:
{
  "score": <integer 1-5>,
  "reasoning": "<one sentence explanation>"
}`;

  const rawResponse = await callAgentModel(prompt);

  try {
    return JSON.parse(rawResponse);
  } catch (err) {
    logger.error("Failed to parse judge response:", rawResponse);
    throw new Error(`Judge response was not valid JSON: ${rawResponse}`);
  }
}
