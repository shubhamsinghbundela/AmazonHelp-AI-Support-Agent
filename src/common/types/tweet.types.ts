export interface RawTweet {
  tweet_id: string;
  author_id: string;
  inbound: string; // "True" | "False" (string from CSV)
  created_at: string;
  text: string;
  response_tweet_id: string;
  in_response_to_tweet_id: string;
}

export interface Conversation {
  conversation_id: string; // root_id
  conversation: string; // full transcript
  customer_problem: string; // customer messages only
  brand_responses: string; // brand messages only
  turn_count: number;
  customer_turns: number;
  first_timestamp: string;
  last_timestamp: string;
}
