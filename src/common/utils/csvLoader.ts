import { createReadStream } from "fs";
import { parse } from "csv-parse";
import type { RawTweet } from "../types/tweet.types";

/**
 * Streams a large CSV row by row instead of loading it all into memory.
 * Equivalent to pandas' read_csv, but memory-safe for 500MB+ files.
 */
// This function is ASYNC because reading a large file from disk takes time —
// we can't read it instantly, so we need to "await" each chunk as it arrives.
//
// The "*" after "function" makes this a GENERATOR function.
// A generator doesn't return one value and finish — instead it can "yield"
// multiple values over time, pausing after each one.
//
// Why "yield" instead of "return"?
// - "return" would force us to build the ENTIRE array of 2.8 million rows
//   in memory first, then hand it all over at once — very memory-heavy.
// - "yield" hands over ONE row at a time. The function pauses right after
//   yielding, and only continues to the next row when the caller asks for it
//   (via `for await...of`). This keeps memory usage low no matter how big
//   the file is.
export async function* streamCsv(filePath: string): AsyncGenerator<RawTweet> {
  // createReadStream reads the file in small chunks (not all at once).
  // .pipe(parse(...)) feeds those raw chunks into the CSV parser,
  // which reassembles them into clean row objects as data flows in.
  const parser = createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true, // ignore blank lines in the file
      relax_column_count: true, // don't crash if a row has extra/missing columns
    }),
  );

  // Loop over each row AS IT ARRIVES from the parser (not all at once).
  // "for await" pauses here until the next row is ready.
  for await (const row of parser) {
    yield row as RawTweet;
  }
}
