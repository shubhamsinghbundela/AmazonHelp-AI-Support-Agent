export const INTENTS = [
  {
    id: "DELIVERY_DELAY",
    name: "Delivery Delay",
    description: "Order hasn't arrived, delayed, tracking issues",
  },
  {
    id: "WRONG_ITEM",
    name: "Wrong/Missing Item",
    description: "Sent wrong item, items missing from order",
  },
  {
    id: "DAMAGED_PACKAGING",
    name: "Damaged Item / Packaging",
    description: "Item arrived damaged, packaging damaged",
  },
  {
    id: "BILLING_ISSUE",
    name: "Billing Complaint",
    description: "Wrong charge, duplicate charge, billing errors",
  },
  {
    id: "PRODUCT_QUALITY",
    name: "Product Quality",
    description: "Product defective, poor quality, doesn't work",
  },
  {
    id: "ACCOUNT_ACCESS",
    name: "Account Issues",
    description: "Can't login, account locked, password reset",
  },
  {
    id: "GENERAL_QUESTION",
    name: "General Question",
    description: "How-to questions, product info, order process",
  },
  {
    id: "SERVICE_COMPLAINT",
    name: "Service Complaint",
    description: "Poor customer service, unresponsive, rude support",
  },
  {
    id: "OTHER",
    name: "Other",
    description: "Complaints that don't fit other categories",
  },
] as const;

export type IntentType = (typeof INTENTS)[number]["id"];

// type IntentType =
//   | "DELIVERY_DELAY"
//   | "WRONG_ITEM"
//   | "BILLING_ISSUE"
//   | "DAMAGED_PACKAGING"
//   | "PRODUCT_QUALITY"
//   | "ACCOUNT_ACCESS"
//   | "GENERAL_QUESTION"
//   | "SERVICE_COMPLAINT"
//   | "OTHER";
