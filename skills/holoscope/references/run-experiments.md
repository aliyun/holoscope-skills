---
name: holoscope-run-experiments
description: Execute, resume, and compare HoloScope agent or model experiments on a frozen dataset, with controlled repeats, trace/score associations, budgets, and uncertainty-aware regression analysis.
metadata:
  required_access:
    - HOLOSCOPE_PROJECT_INTERFACE
---

# Run and compare experiments

Read [experiment data model](https://langfuse.com/docs/evaluation/experiments/data-model), [SDK experiments](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk), and current HoloScope contracts. Verify the SDK runner's required endpoints before adopting it; an SDK major compatible with OTLP does not prove its experiment APIs work here.

## Establish an executable contract

1. Confirm the frozen dataset manifest, eligible item IDs, candidate entrypoints, baseline, metrics, and decision to make. If the application entrypoint or required fixtures are missing, deliver an explicit blocked execution plan; do not invent outputs or substitute a direct model call for a tool-using agent.
2. Distinguish agent comparison from model comparison. To isolate models, hold agent code, prompts, tool permissions/fixtures, context budget, and environment fixed. To compare whole agents, record their differences and describe results as end-to-end system differences, not model-only causation.
3. Record candidate code/prompt/model versions, decoding parameters, fixture/data hashes, evaluator version/model, and limits. Keep labels, judge rubrics, and future tool observations out of candidate inputs. Disable production side-effecting tools or use an explicitly approved sandbox.
4. Agree on items × candidates × repetitions, candidate/judge costs, concurrency, per-call timeout, total budget, and stop conditions. Default to a small approved smoke run, then expand only within the authorization. Treat unknown pricing as unknown, not free; bound calls/tokens/time as well as currency.
5. Verify each candidate runtime in the execution environment, including CLI/model routing and isolation. If a capability exists only remotely, use that environment only when authorized; do not substitute another engine, enable fallback, or expose production HOME, memory/skills, credentials, or labels to make a run succeed.

## Plan stochastic repeats

- Use the same eligible items for every candidate and multiple independent repetitions when assessing stability. Propose an affordable count (for example 3–5), not a statistically sufficient default. Seeds help only where supported; temperature zero is not a reproducibility guarantee.
- Counterbalance or randomize candidate order, reset state between cases, and fix tool snapshots. Separate intentional repetitions from retries. Preserve timeouts and failures in the attempt ledger; do not rerun until success and drop failures.
- In the legacy dataset-run flow, use a distinct run name per candidate × repetition, with one result per item in each run. Include a shared comparison ID and repetition index in metadata/manifest; do not overwrite an item's earlier trial in the same run.

## Execute and persist

1. Prepare a local manifest/ledger outside version control if sensitive: comparison ID, dataset/item hashes, candidate and repetition, service name, run name, attempt state, trace/observation IDs, association state, evaluator version, score IDs, and errors. Keep checkpoints after each external step.
2. Execute the actual candidate on the approved input. Instrument it through the supported OTLP path, capture fresh output and root trace ID, and flush before exit. Set a non-empty OTel resource `service.name` before SDK/exporter initialization. In verified legacy ingestion, also set Trace-level `serviceName` and observation `serviceName` at initial creation: adding only an OTLP span did not fill every legacy Trace's attribution. Read back both levels and reject blank/`unknown_service`; trace names, tags, and run names are not substitutes. Historical output is only a baseline artifact, never a new candidate result.
3. Use a compatible SDK runner if verified; otherwise associate the new trace with the existing item through `POST /api/public/dataset-run-items` using the discovered schema. Trace ingestion alone does not create a dataset run item. Verify item ID, run name, dataset, and candidate trace association.
4. Choose **one scoring owner per metric**: an approved hosted experiment rule or a local evaluator. Ensure hosted rules match dataset IDs and the candidate's `service.name`, are enabled before the relevant ingestion, and resolve to the intended evaluator version. They do not backfill historical results. Avoid duplicate judge calls/scores from also running the metric locally.
5. For local scoring, validate types/ranges and associate uploaded scores with the actual candidate trace/observation and run where supported. Include non-empty `comment`, structured check/evidence details, and scorer version/hash; `metadata` alone does not populate the console's evaluation-reason column. Flush, then read back scores using an endpoint that includes associations. Keep judge errors and `not_evaluable` separate from candidate failure.
6. Read back runs/items/scores with pagination and bounded retries. Verify requested versus observed coverage and joins. A runner return or HTTP 200 alone does not prove an experiment is complete. Keep unverified results marked pending, not silently successful.

## Gate expansion on a complete smoke result

- Verify one result per candidate through dataset item → run item → candidate Trace/Observation → scores, including Agent/service-filtered discovery. Inspect hosted rules' dataset/service selectors and JSON-path extraction (for example a wrapped answer), not just the existence of scores.
- Compute expected coverage per metric from eligible executions, sampling, and scoring ownership. With full eligibility/sampling, N executions and K metrics require N × K scores; count API and EVAL separately. Confirm unique score identities, associations, explanations, and quality interpretation without treating missing/unconfigured judgments as zero.
- If API readback is complete but the console is empty, inspect selected service, time/environment filters, target/observation scope, pagination, and score-to-rule/evaluator identity. Do not rerun agents or judges to repair a display/join problem. Numeric values and quality badges are separate acceptance checks.

## Resume without duplicating work

- Compare the manifest with current item/candidate/evaluator/fixture hashes. Stop or start a new comparison if they changed; do not merge incompatible configurations under one result.
- Reconcile ambiguous writes by run/item/trace/score identity before repeating anything. A missing immediate read may be ingestion lag. Stable IDs help only with verified endpoint semantics; do not assume every POST upserts.
- If candidate output/trace is durable but association or score upload failed, retry only the missing step. If the candidate outcome is unknown, record that attempt and request a budgeted retry; never silently invoke production tools again.
- Preserve partial runs and a resume ledger on cancellation, budget exhaustion, or errors. Cleanup is a separately approved operation on exact disposable resources; never delete source traces or built-in evaluators.

## Recover hosted judge failures separately

- Group execution statuses/errors by rule and inspect job/score IDs before changing anything. A `PENDING` database status can coexist with an active queue job; check lock, elapsed time, delayed release, attempts, and completion. Completed executions should have a readable `jobOutputScoreId`, not merely a finished queue record.
- For LLM timeouts, separate candidate runtime, HTTP client, hosted worker, queue retry, and provider limits. Where operator access is authorized, inspect `LANGFUSE_FETCH_LLM_COMPLETION_TIMEOUT_MS` and concurrency in every live worker after rollout. A larger timeout does not automatically retry old `ERROR` executions; inspect retry policy and request a bounded recovery action.
- Before recovery, verify exact stored evaluation inputs, identifiers, and reference availability. Check the tenant prefix and `.json` suffix of object keys; a missing key or an absent match on the first listing page does not prove the input is lost. Never fabricate recovery input or rewrite storage from a guessed path.
- Preview only failed eligible execution IDs, preserve completed scores, and reconcile already-active jobs. Use a supported recovery path; queue/database intervention requires explicit operator approval and a reviewed payload. Recover one execution and verify its score before throttled batch release; do not replay candidates or reset all jobs. Monitor until all are accounted for or report residual failures.

## Compare and report

- Join by frozen item ID and repetition, not run averages alone. Report requested/completed/scored/failed/not-evaluable counts per candidate and metric; label partial results. Show common scored coverage for paired comparisons and failure rates over all scheduled attempts so selective success does not distort the ranking.
- Report per-item wins/ties/losses with a predefined metric direction and meaningful-difference threshold, regression examples with trace IDs, latency, tokens, and measured/estimated/unknown cost. Show category slices and stability across repeats; do not invent missing cost data.
- Define the latency boundary: CLI cold start, authentication, network, and orchestration may be included, so end-to-end time is not pure inference time. Check captured token usage separately from cost; zero cost from a missing price entry does not establish free execution.
- Treat repeated outcomes from the same task as correlated. Aggregate within task and estimate paired uncertainty across tasks (for example task-level bootstrap) when sample size permits; do not inflate sample size by treating every repeat as an independent task. With tiny or biased sets, state that a reliable winner is not established.
- Distinguish candidate randomness from judge disagreement using reviewed anchors or repeated judging on ambiguous cases. Same-name evaluator versions can move live rules: verify resolved versions did not drift mid-comparison; split or invalidate affected results if they did.
- Deliver the configuration manifest, verified run IDs/names, coverage and paired deltas, concrete regressions, limitations, and a bounded recommendation. Report "no clear difference" when warranted rather than force a winner.
