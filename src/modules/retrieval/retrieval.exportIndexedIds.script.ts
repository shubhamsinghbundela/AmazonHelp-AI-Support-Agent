import { writeFileSync } from "fs";
import path from "path";
import { getIndex } from "./retrieval.pinecone.service";
import { logger } from "../../common/utils/logger";

async function main() {
  const index = getIndex();
  const indexedIds: string[] = [];

  let paginationToken: string | undefined = undefined;

  do {
    const result = await index.listPaginated({
      limit: 100,
      paginationToken,
    });

    const ids =
      result.vectors?.map((v) => v.id).filter((id): id is string => !!id) ?? [];
    indexedIds.push(...ids);
    paginationToken = result.pagination?.next;

    logger.info(`Fetched ${indexedIds.length} IDs so far...`);
  } while (paginationToken);

  const outputPath = path.join(
    process.cwd(),
    "data/processed/indexed-ids.json",
  );
  writeFileSync(outputPath, JSON.stringify(indexedIds, null, 2));

  logger.info(` Saved ${indexedIds.length} indexed IDs to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
