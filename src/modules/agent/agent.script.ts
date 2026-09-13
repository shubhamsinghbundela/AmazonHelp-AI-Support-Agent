import { handleCustomerMessage } from "./agent.service";

async function main() {
  const testMessage = process.argv[2];

  if (!testMessage) {
    console.error('Usage: bun run agent:test "your message here"');
    process.exit(1);
  }

  const result = await handleCustomerMessage(testMessage);

  console.log("\n=== Agent Response ===");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
