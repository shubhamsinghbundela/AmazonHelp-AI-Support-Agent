export interface DataPrepOptions {
  brandAuthorId: string; // e.g. "AmazonHelp"
  minTurns: number; // e.g. 2
  maxTurns: number; // e.g. 20 (filter out the 448-turn outliers)
  englishOnly: boolean;
}
