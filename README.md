
## Quick Start

### 1. Install Bun

**Using npm** (if you already have Node.js installed):

```bash
npm install -g bun
```

**Or, direct install:**

macOS / Linux:

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Setup

```bash
git clone <this-repo>
cd AmazonHelp-AI-Support-Agent
bun install
cp .env.example .env
# Paste the API keys provided separately (via email) into `.env`.
```

### 3. Try the agent

```bash
bun run agent:test "My order hasn't arrived in 2 weeks"
```

Expected output:

```json
{
  "intent": "DELIVERY_ISSUE",
  "reply": "I'm sorry for the delay! Please share your order number...",
  "decision": "AUTO_HANDLE",
  "reason": "Standard delivery delay, resolvable with tracking guidance"
}
```

### 4. Evaluation Harness

```bash
bun run eval:intent       # intent + decision accuracy against the golden set
bun run eval:judge        # LLM-judge vs human agreement on reply quality
```

---

## Golden Evaluation Set

**220 real customer messages**, hand-labeled with the correct intent and decision.

**How they were sampled:** Drawn only from conversations *not* included in the Pinecone retrieval index (a held-out pool of ~63,000 conversations) — this prevents the agent from being tested on a message it could trivially retrieve its own exact answer for. Sampling used a seeded shuffle (`evaluation.sampleGoldenCandidates.script.ts`) so the same 220 examples are reproducible on any machine.

**How they were labeled:** Each message was manually read and assigned one of 13 intent categories (derived by first reading 100+ real conversations before defining the taxonomy — not decided upfront) and a decision (`AUTO_HANDLE` or `ESCALATE`, following a fixed policy: billing and account issues always escalate; everything else defaults to auto-handle unless clearly severe).

File: [`golden-set/golden-candidates.json`](./golden-set/golden-candidates.json)

---

## Evaluation Harness

**Automated metrics** (`bun run eval:intent`): runs the agent against all 220 golden examples, computes intent accuracy, decision accuracy, per-intent breakdown, and a confusion matrix.

**Result:** 72.6% intent accuracy, 85.4% decision accuracy.

**LLM-as-judge for reply quality** (`bun run eval:judge`): scores the 50 sampled replies 1-5 against a rubric (issue-specificity, grounding, appropriate next step, tone), and compares those scores against my own manual scoring of the same 50 replies.

**Result:** 100% agreement within 1 point, 32% exact agreement, average difference 0.68 (n=50) — this is the evidence that the LLM judge can be trusted for reply-quality scoring. 

---

## Pipeline Overview

```
New customer message
        │
        ▼
┌───────────────────┐
│  Embed (Voyage)     │  convert message to a vector
└─────────┬───────────┘
          │
          ▼
┌───────────────────┐
│  Retrieve (Pinecone)│  find 5 similar past AmazonHelp conversations
└─────────┬───────────┘
          │
          ▼
┌───────────────────┐
│  Classify + Draft    │  LLM (gpt-5.4-mini) picks an intent, drafts a
│  + Decide (OpenAI)   │  reply grounded in the retrieved examples, and
│                       │  decides auto-handle vs escalate
└─────────┬───────────┘
          │
          ▼
{ intent, reply, decision, reason }
```

---

## Project Structure

```
src/
├── common/                    # infrastructure with no single owning module
│   ├── config/env.ts
│   ├── types/tweet.types.ts
│   ├── utils/ (csvLoader, logger, sleep, sampling)
│   └── llm/ (openai.service, voyageEmbedding.service)
├── modules/
│   ├── dataPrep/               # raw CSV -> clean conversation threads
│   ├── intent/                 # shared intent taxonomy (13 categories)
│   ├── retrieval/               # Pinecone indexing + retrieval
│   ├── agent/                  # orchestrator: embed -> retrieve -> classify -> decide
│   └── evaluation/             # golden set, automated metrics, baselines, LLM judge
data/
├── raw/twcs.csv                # (not committed — see Data section)
└── processed/                  # cleaned conversations, indexed IDs
golden-set/                     # hand-labeled eval set + all evaluation outputs
```

Each module's files follow a `moduleName.description.type.ts` naming convention (e.g. `dataPrep.service.ts`, `evaluation.runLLMIntentEval.script.ts`).

---
