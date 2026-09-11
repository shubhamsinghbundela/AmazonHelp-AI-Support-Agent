import { createReadStream } from "fs";
import { parse } from "csv-parse";
import type { RawTweet } from "../types/tweet.types";

/**
 * Streams a large CSV row by row instead of loading it all into memory.
 * Equivalent to pandas' read_csv, but memory-safe for 500MB+ files.
 */
export async function* streamCsv(filePath: string): AsyncGenerator<RawTweet> {
  const parser = createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }),
  );

  for await (const row of parser) {
    yield row as RawTweet;
  }
}
