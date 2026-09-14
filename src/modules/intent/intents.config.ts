export const INTENTS = [
  {
    id: "DELIVERY_ISSUE",
    name: "Delivery Issue",
    description:
      "Order delayed, not arrived, driver/delivery problems, tracking issues, order cancellation, wrong order placed, order stuck in processing",
  },
  {
    id: "WRONG_ITEM",
    name: "Wrong/Missing Item",
    description: "Sent wrong item, items missing from order",
  },
  {
    id: "PACKAGING_ISSUE",
    name: "Packaging Issue",
    description: "Item arrived damaged, packaging damaged, box crushed/opened",
  },
  {
    id: "RETURN_REPLACEMENT_REFUND",
    name: "Return / Replacement / Refund",
    description:
      "Customer wants to return an item, requests a replacement, or requests a refund for a legitimate reason (not a billing error/dispute)",
  },
  {
    id: "BILLING_ISSUE",
    name: "Billing Complaint",
    description: "Wrong charge, duplicate charge, disputed/incorrect billing",
  },
  {
    id: "PRODUCT_ISSUE",
    name: "Product Issue",
    description:
      "Product defective, poor quality, doesn't work, stopped working",
  },
  {
    id: "ACCOUNT_ISSUE",
    name: "Account Issue",
    description: "Can't login, account locked, password reset, account closure",
  },
  {
    id: "WEBSITE_ISSUE",
    name: "Website/App Issue",
    description:
      "App crashes, website bugs, checkout errors, technical problems with the platform",
  },
  {
    id: "GENERAL_QUESTION",
    name: "General Question",
    description: "How-to questions, product info, order process",
  },
  {
    id: "SERVICE_COMPLAINT",
    name: "Service Complaint",
    description:
      "Poor customer service experience, rude support, unresponsive agents",
  },
  {
    id: "POSITIVE_FEEDBACK",
    name: "Positive Feedback",
    description: "Compliments, thank you messages, positive experience shared",
  },
  {
    id: "OTHER",
    name: "Other",
    description: "Complaints that don't fit other categories",
  },
] as const;

export type IntentType = (typeof INTENTS)[number]["id"];
