---
name: holoscope-observability
description: Instrument LLM applications with tracing reported to HoloScope. Use when connecting an app or coding agent to HoloScope, adding observability to LLM calls, or auditing existing instrumentation.
metadata:
  required_access:
    - CODEBASE
    - HOLOSCOPE_PROJECT_SCRIPT
---

# HoloScope Observability

Instrument LLM applications with tracing reported to HoloScope, following best practices and tailored to the use case.

## Workflow

### 1. Assess Current State

Check the project: is a Langfuse SDK or OTel exporter installed? What LLM frameworks are used (OpenAI SDK, LangChain, LlamaIndex, Vercel AI SDK, etc.)? Is there existing instrumentation?

**No integration yet**, pick the path that fits:

- **CLI coding agents** (Claude Code, Codex, Qoder, OpenClaw): use HoloScope's one-line installer per [Connect agents to HoloScope](https://help.aliyun.com/zh/hologres/user-guide/connect-agents-to-holoscope); it prompts for endpoint, keys, user ID, and service name.
- **Applications**: use a Langfuse SDK framework integration if available (captures more context with less code than manual instrumentation), with `LANGFUSE_BASE_URL` set to the HoloScope endpoint. Prefer OTel-based majors (Python v4, JS/TS v5) — HoloScope's primary ingestion is OTLP/HTTP. Any standard OTel exporter with PK/SK auth on requests also works.

**Integration exists:** Audit against baseline requirements below.

### 2. Verify Baseline Requirements

Every trace should have these fundamentals:

| Requirement               | Check                                                                                    | Why                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Model name                | Is the LLM model captured?                                                               | Enables model comparison and filtering                 |
| Token usage               | Are input/output tokens tracked?                                                         | Enables cost/usage analytics                           |
| Good trace names          | Are names descriptive? (`chat-response`, not `trace-1`)                                  | Makes traces findable and filterable                   |
| Span hierarchy            | Are multi-step operations nested properly?                                               | Shows which step is slow or failing                    |
| Correct observation types | Are generations marked as generations, and is each other call given its most specific type (`retriever` for a lookup, `agent` for a subagent, etc.) rather than a generic `tool`/`span`? See the [observation types docs](https://langfuse.com/docs/observability/features/observation-types). | Enables model-specific analytics and a readable trace tree |
| Sensitive data masked     | Is PII/confidential data excluded or masked?                                             | Prevents data leakage                                  |
| Trace input/output        | Does the trace capture meaningful input/output? Is input explicitly set to show only relevant data (e.g., user message), not all function args? | Makes traces readable in the console and avoids leaking sensitive args |

Framework integrations handle model name, tokens, and observation types automatically. Prefer integrations over manual instrumentation. Docs: https://langfuse.com/docs/tracing

**Beyond the baseline**, add context relevant to the app. Infer from code where possible; only ask when it's not obvious. These are not baseline — add only what fits:

| If code shows...                                     | Add                 | Why                                                                             |
| ---------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| Conversation history, chat endpoints, message arrays | `session_id`        | Groups conversations — [docs](https://langfuse.com/docs/tracing-features/sessions) |
| User authentication, `user_id` variables             | `user_id`           | User filtering and cost attribution — [docs](https://langfuse.com/docs/tracing-features/users) |
| Multiple distinct endpoints/features                 | `feature` tag       | Per-feature analytics — [docs](https://langfuse.com/docs/tracing-features/tags) |
| Feedback collection, ratings                         | Feedback score      | Quality filtering and trends — [docs](https://langfuse.com/docs/scores/overview) |
| Image/audio/file input or output                     | Media in observation input/output | Base64 data URIs and external URLs are handled automatically; wrap raw bytes/files per the [multi-modality docs](https://langfuse.com/docs/observability/features/multi-modality) |

### 3. Run and Self-Audit the Traces (required)

Instrumentation isn't done when the code compiles. This is a loop you own as the agent:

**a.** Execute the instrumented path end-to-end so a trace is actually sent.

**b.** Fetch the trace(s) you just created from HoloScope — `langfuse-cli` is usually simplest (see [cli.md](cli.md)), REST also works.

**c.** Audit the trace against the best-practices page. **Always fetch it fresh — never audit from memory** (the guidance changes over time): https://langfuse.com/docs/observability/best-practices

For each observation ask: is all data a user might need later, to understand exactly what context the agent had when it made decisions, available?

Cost caveat: `calculatedTotalCost` is 0 for models missing from the bundled default price table (including Qwen models, verified), even when usage is captured correctly — and there is no models API to add prices. Judge token capture by `usage`, not cost.

**d.** Fix every gap, then re-run and re-fetch to confirm. Repeat until the trace clears the guidance. Then report what you audited and changed, and link the final trace.

### 4. Explore Traces With the User

With a clean trace in place, invite the user to explore it in the HoloScope console: 调用链路 (trace tree + node details), 会话记录 (sessions, if `session_id` added), 模型调用 (per-LLM-call tokens/latency), Agent总览/指标概览 (aggregates). See [Agent data analysis](https://help.aliyun.com/zh/hologres/user-guide/agent-data-analysis-in-holoscope). This helps them spot what's missing and ask better questions about what to add next.

When suggesting additions, always explain the user benefit (what the attribute enables in the console), not just the code change.

## Multi-agent systems (subagent dispatch)

When one agent's execution dispatches OTHER agents (coding agents, research agents, orchestrator/worker architectures), a few extra points on top of the baseline:

- **Type a subagent's own execution as `agent`, not `tool`/`span`.** A bare tool/span for a dispatch hides all of the subagent's internal structure.
- **Don't emit duplicate dispatch + execution nodes.** Emit only the `agent` observation when you have the subagent's actual execution; keep a bare tool span only as a fallback when you have no visibility into what the subagent did.
- **Nest recursively.** Nest the subagent's `agent` observation under the `agent` or `span` that orchestrates the dispatch, as a sibling of the `generation` that requested it. Within the subagent, apply the same rule to its generations, tool calls, and nested subagents.
- **Name subagents distinctly.** Frameworks often default every subagent to the same generic role name; derive a specific name from the subagent's actual task/role when the framework doesn't provide one.

## Common Mistakes

| Mistake                                        | Problem                                             | Fix                                                                               |
| ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| No `flush()` in scripts                        | Traces never sent                                   | Call `langfuse.flush()` before exit                                               |
| Flat traces                                    | Can't see which step failed                         | Use nested spans for distinct steps                                               |
| Generic trace names                            | Hard to filter                                      | Use descriptive names: `chat-response`, `doc-summary`                             |
| Not explicitly setting input with `@observe`   | All function args become trace input (including API keys, configs) | Python: `langfuse.update_current_span(input=...)`. JS/TS: `updateActiveObservation({ input: ... })` |
| Manual instrumentation when integration exists | More code, less context                             | Use framework integration                                                         |
| Langfuse import before env vars loaded         | SDK initializes with missing/wrong credentials      | Import Langfuse AFTER loading environment variables (e.g., after `load_dotenv()`) |
| Wrong import order with OpenAI                 | Langfuse can't patch the OpenAI client              | Import Langfuse and call its setup BEFORE importing the OpenAI client             |
