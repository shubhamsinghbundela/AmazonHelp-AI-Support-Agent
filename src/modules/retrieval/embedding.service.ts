import { env } from "../../common/config/env";
import { logger } from "../../common/utils/logger";

// Define the shape of Voyage's API response
interface VoyageEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
}

/**
 * Calls Voyage AI's embedding API for a batch of texts.
 * Voyage allows multiple texts per request, so we batch to
 * minimize the number of API calls (respects rate limits).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.voyageApiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: env.voyageModel,
      input_type: "document", // tells Voyage these are documents to be searched later
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Voyage API error (${response.status}):`, errorText);
    throw new Error(`Voyage API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as VoyageEmbeddingResponse;

  logger.info(`Received ${data.data.length} embeddings`);
  logger.info(
    `Embedding dimension: ${data.data[0]?.embedding.length ?? "unknown"}`,
  );
  // data.data is an array of { embedding: number[], index: number }
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Splits an array into chunks of a given size.
 * Used to batch conversations into API-call-sized groups.
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Simple delay helper, used to space out API calls if needed.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
