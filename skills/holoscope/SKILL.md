---
name: holoscope
description: >-
  Interact with Alibaba Cloud HoloScope (Hologres agent observability, Langfuse-API-compatible) and access its documentation: tracing, monitoring, creating datasets, running experiments, and evaluating AI applications. Use when the user mentions HoloScope or Hologres agent observability, or needs to (1) query or modify HoloScope data, (2) look up how to connect, instrument, or evaluate agents with HoloScope, or (3) do AI engineering tasks (observability, evaluation, dataset management, feedback collection) against a HoloScope endpoint.
allowed-tools:
  - WebFetch(domain:langfuse.com)
  - WebFetch(domain:help.aliyun.com)
  - Bash(curl *langfuse.com/*)
  - Bash(npx langfuse-cli api __schema *)
  - Bash(npx langfuse-cli api * --help *)
  - Bash(npx langfuse-cli api * list *)
  - Bash(npx langfuse-cli api * get *)
  - Bash(bunx langfuse-cli api __schema *)
  - Bash(bunx langfuse-cli api * --help *)
  - Bash(bunx langfuse-cli api * list *)
  - Bash(bunx langfuse-cli api * get *)
---

# HoloScope

HoloScope is Alibaba Cloud's agent observability and evaluation service (part of Hologres). It exposes a Langfuse-compatible API subset, so Langfuse SDKs, the `langfuse-cli`, and Langfuse docs on SDK/API usage apply — within the supported surface below.

## Core Principles

Follow these principles for ALL HoloScope work:

1. **Documentation First**: NEVER implement based on memory. Always fetch current docs before writing code. See the documentation section below for the two sources and when to use each.
2. **Check the supported API surface first**: HoloScope serves only the endpoints listed below — anything else returns 404. Ignore Langfuse docs/SDK features that depend on unavailable endpoints.
3. **CLI for Data Access**: Use `langfuse-cli` pointed at the HoloScope endpoint when querying/modifying data. See the CLI section below.
4. **Prefer OTel-based SDK majors** (Python v4, JS/TS v5) unless the user specified otherwise: HoloScope's primary ingestion path is OTLP/HTTP. Even if you're only creating a plan for another agent to execute, be explicit about the exact version to use.
5. **If you guide the user through UI**: the HoloScope console (https://hologram.console.aliyun.com, HoloScope服务) is in Chinese; inspect the user's screenshots or ask to see the relevant screen rather than assuming labels match API, SDK, or CLI fields.

## Supported API Surface

All paths relative to the HoloScope endpoint (see Credentials). Unlisted paths return 404.

- **Write**: `POST /api/public/otel/v1/traces` (OTLP/HTTP, preferred) and `POST /api/public/otel/v1/metrics`; `POST /api/public/ingestion` (legacy batch — Langfuse sunsets this path Nov 2026); `POST /api/public/scores`; media upload (`POST /api/public/media`, `PATCH /api/public/media/{mediaId}` — returned upload URLs point to an OSS-internal host, so the direct PUT succeeds only from inside Alibaba Cloud VPC)
- **Read/manage**: traces `GET`/`DELETE /api/public/traces` and `.../{traceId}`; observations `GET /api/public/observations` and `.../{observationId}` (v1 only); sessions `GET /api/public/sessions` and `.../{sessionId}`; scores `GET /api/public/v3/scores` and `GET /api/public/v2/scores`; datasets `GET/POST /api/public/v2/datasets` and `GET .../{datasetName}`; dataset items `POST/GET /api/public/dataset-items` and `GET/DELETE .../{id}`; dataset run items `POST/GET /api/public/dataset-run-items`; runs `GET /api/public/datasets/{datasetName}/runs` and `GET/DELETE .../{runName}`; `GET /api/public/projects` (SDK auth check); `GET /api/public/health` (requires Basic auth, unlike upstream Langfuse)
- **v4-gated (probe with a GET before relying on these)**: experiments `GET /api/public/experiments` and `GET /api/public/experiment-items` (both require `fromStartTime`); evaluators `GET/POST /api/public/unstable/evaluators` and `GET/DELETE .../{evaluatorId}`; `GET/POST /api/public/unstable/evaluation-rules` and `GET/PATCH/DELETE .../{evaluationRuleId}`. The gateway allows these, but they need a Langfuse v4-write-mode backend — on a v3-write-mode backend they currently return 404.
- **Not available (404)**: prompt management, annotation queues, comments, metrics query APIs (`/metrics`, `/metrics/daily`), `GET /api/public/v2/observations`, score configs, models, org/project management.

## Use case specific references

- instrumenting an existing function/application or connecting a coding agent to HoloScope: references/instrumentation.md
- creating or getting to a good (evaluation) dataset to measure quality or test for regressions in AI systems: references/create-dataset.md
- creating a prompt or changing any part of an existing prompt, including small edits and debugging/tuning: references/prompt-engineering.md
- setting up evals when the user needs to identify gaps across signal capture, monitoring, and evaluator metrics ("I have traces, how do I set up evals?"): references/setting-up-evals.md
- capturing user feedback (thumbs, ratings, implicit signals) as scores on traces: references/user-feedback.md
- further tips on using the Langfuse CLI against HoloScope: references/cli.md
- upgrading or migrating Langfuse SDKs and preserving application instrumentation attributes: references/sdk-upgrade.md

## 1. Langfuse CLI against HoloScope

Use the `langfuse-cli` to interact with the HoloScope API from the command line. Run via npx (no install required):

```bash
# HoloScope runs a Langfuse 3.x backend — always pass --api-version 3.225.3
# (the CLI's default 4.x snapshot refuses the v1 read endpoints as deprecated)
npx langfuse-cli api --api-version 3.225.3 <resource> <action>

# Discover all available resources (lists the FULL Langfuse API — cross-check against the supported surface above)
npx langfuse-cli api __schema

# List actions for a resource
npx langfuse-cli api <resource> --help

# Show args/options for a specific action
npx langfuse-cli api <resource> <action> --help
```

### Credentials

Set environment variables before making calls:

```bash
export LANGFUSE_PUBLIC_KEY=pk-...
export LANGFUSE_SECRET_KEY=sk-...
export LANGFUSE_BASE_URL=<HoloScope endpoint>   # copy from console: HoloScope服务 -> 概览 -> 连接管理 (no derivable URL pattern)
```

API key pairs are created in the console under the project's **Agent快速接入 -> API Key管理**. The Secret Key is shown in full only once at creation — treat it as unrecoverable. If the user has no HoloScope service yet: it is in public beta (free) and currently available only in China East 1 (Hangzhou); see [activation and billing](https://help.aliyun.com/zh/hologres/user-guide/activate-and-billing-of-holoscope). Do not ask users to paste keys into chat for security reasons.

## 2. Documentation

Two sources; always prefer your application's native web fetch and search tools over `curl` when available.

### 2a. Langfuse docs — SDK and API usage

The API is Langfuse-compatible, so Langfuse docs are the reference for SDK setup, instrumentation, and API mechanics. Skip anything about prompt management, annotation queues, comments, or metrics query APIs — those endpoints are not available on HoloScope.

- Index of all pages: `https://langfuse.com/llms.txt`
- Any page as markdown: append `.md` to its path (e.g. `https://langfuse.com/docs/observability/overview.md`) or send `Accept: text/markdown`
- Search across docs and GitHub issues/discussions: `https://langfuse.com/api/search-docs?query=<url-encoded-query>` — great fallback when the topic is unclear; extract only the relevant portions. Never implement from changelog posts — use docs and API/SDK references.

### 2b. HoloScope product docs — console, billing, evaluators, security

Fetch these help.aliyun.com pages for anything product-specific:

- [Activation and billing](https://help.aliyun.com/zh/hologres/user-guide/activate-and-billing-of-holoscope)
- [Connect agents to HoloScope](https://help.aliyun.com/zh/hologres/user-guide/connect-agents-to-holoscope) — endpoints, API keys, coding-agent installer, OTLP ingestion
- [Agent data analysis](https://help.aliyun.com/zh/hologres/user-guide/agent-data-analysis-in-holoscope) — console views for traces, sessions, model calls
- [Agent evaluation](https://help.aliyun.com/zh/hologres/user-guide/agent-evaluation-in-holoscope) — built-in evaluators and their configuration
- [Permissions and security](https://help.aliyun.com/zh/hologres/user-guide/permissions-and-security-of-holoscope) — RAM policies, project roles, IP whitelist
- [HoloScope service API list](https://help.aliyun.com/zh/hologres/user-guide/holoscope-service-api-list)
