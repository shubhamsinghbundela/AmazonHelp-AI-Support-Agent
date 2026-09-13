import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../../common/config/env";
import { logger } from "../../common/utils/logger";

const pinecone = new Pinecone({ apiKey: env.pineconeApiKey });

//Gets a "connection handle" to your specific Pinecone index
export function getIndex() {
  return pinecone.index(env.pineconeIndexName);
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    customer_problem: string;
    brand_responses: string;
    turn_count: number;
  };
}

/**
 * Uploads a batch of vectors to Pinecone.
 * Pinecone's upsert can handle up to ~100 vectors per call efficiently.
 */
export async function upsertBatch(records: VectorRecord[]): Promise<void> {
  const index = getIndex();
  //call Pinecone's built-in method to insert or update vectors
  await index.upsert({ records: records }); // ← wrap in an object with "records" key
}

/**
 * Query Pinecone for the top-K most similar vectors to a given embedding.
 */
export async function queryTopK(
  queryVector: number[],
  topK: number = 5,
): Promise<Array<{ score: number; metadata: VectorRecord["metadata"] }>> {
  const index = getIndex();
  const results = await index.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  return results.matches.map((match) => ({
    score: match.score ?? 0,
    metadata: match.metadata as VectorRecord["metadata"],
  }));
}
