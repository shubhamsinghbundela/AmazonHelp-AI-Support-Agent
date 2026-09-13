function required(key: string): string {
  const value = process.env[key];
  if (!value || value === "your_api_key_here") {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const env = {
  voyageApiKey: required("VOYAGE_API_KEY"),
  voyageModel: process.env.VOYAGE_MODEL || "voyage-3.5-lite",
  pineconeApiKey: required("PINECONE_API_KEY"),
  pineconeIndexName: process.env.PINECONE_INDEX_NAME || "amazon-support-agent",
};
