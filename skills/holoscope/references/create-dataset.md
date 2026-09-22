---
name: holoscope-dataset-construction
description: Create, review, or upload HoloScope regression datasets from traces or expert examples, including task reconstruction, labels, provenance, deduplication, and frozen comparison sets.
metadata:
  required_access:
    - HOLOSCOPE_PROJECT_INTERFACE
---

# HoloScope Dataset Construction

Read the [dataset design guide](https://langfuse.com/academy/datasets) and current HoloScope-compatible dataset contracts. Use verified datasets v2 and dataset-item APIs; upstream dataset-versioning features are not automatically available.

## Agree on the evaluation decision

1. Reuse the user's stated goal, sources, and schema; ask only for missing decisions. Determine whether the set tests final answers, tool decisions, or an entire agent workflow, and whether results will compare agents, models, or versions.
2. Inspect existing traces, datasets, feedback, and expert conclusions. Propose a small distribution covering typical tasks, known failures, boundary cases, and tool failures, rather than only low-score traces. Record sampling criteria; a curated regression set does not estimate production success rate.
3. Draft normally 5–12 high-signal items. Obtain approval for goal, source mix, schema, and this draft together before live upload; existing explicit approval suffices. Local drafts are not uploaded datasets.

## Reconstruct tasks from traces

- Identify the real unit of work from session/parent/observation relationships and timestamps; one trace is not necessarily one task. Separate retries, child agents, judge traces, and multiple user requests before extracting cases.
- Recover the initial user request, context available at the decision point, tool definitions, and relevant tool responses. Mark compaction, truncation, missing spans, or summaries; do not invent lost input. If only a final summary survives, reject full-agent replay or propose a narrower decision case with explicit limitations.
- Distinguish **frozen-context decision tests**, **tool-replay tests**, and **live end-to-end tests**. Tool replay needs argument-aware fixtures and a policy for unseen calls; do not hand every candidate the historical agent's future observations. Live tests require a separately approved sandbox and are not time-invariant historical replay.
- Select reproducibility per item: ready, needs review, or excluded, with reasons. A case missing reference labels may still support reference-free metrics; missing initial input cannot support a faithful rerun.
- Read original task content and relevant human handling records when authorized; task closure, automatic confirmation, or an agent-authored resolution is not human validation of a root cause. Keep source links and reviewer evidence in a separate review-only ledger so labels remain auditable.

## Define the item contract

- `input`: only information actually available to the candidate at the chosen start point, in the agreed task-entrypoint shape. Do not include the reference answer, human resolution, judge rubric, future tool returns, or evaluator-only metadata.
- `expectedOutput`: human-confirmed answer, allowed outcome set, or structured task constraints when available. Historical agent output and AI-generated labels are candidates, not ground truth. If unreviewed, omit the reference and mark it pending; never quietly convert actual output to expected output.
- For diagnosis labels, capture supported root cause, required evidence IDs/facts, relevant actions, prohibited conclusions, and uncertainty boundaries. Check every required ID against input evidence; preserve evidence gaps and distinguish static inspection, reported observation, and independent measurement. Judge only the reviewed scope, not unsupported internal details or another issue in the same ticket.
- `metadata`: source trace/observation/session IDs, task boundary, extraction version, source time, category, label source/reviewer/status, replay mode, fixture version, and limitations. Store historical output here only if needed for review and approved for retention; do not pass all metadata into the candidate.
- Redact secrets and personal information without destroying task meaning. Retain provenance only within the authorized destination; obtain approval before moving data to another project or external judge.
- For frozen-evidence comparisons, use anonymous case/evidence IDs and remove ticket numbers, source URLs, and searchable source identifiers from candidate-visible text. Keep their mapping review-only; do not mount it, references, skills/memory containing answers, or task-system credentials into candidate environments. Removing IDs alone does not prevent lookup: constrain tools/network or use approved replay fixtures.
- Deduplicate by task identity and normalized input/context, not just trace ID. Keep related incident/session variants in one split so train/calibration data cannot leak into the holdout. Preserve meaningful scenario variants explicitly.
- Check the chosen runner separately from dataset storage: some runners require non-empty `expected_output` even for reference-free metrics. Use a verified reference-free path or leave those cases ineligible; do not invent labels or upload placeholder answers to satisfy the runner.

## Upload and freeze

1. Preview destination, new versus existing items, conflicts, exclusions, and label-review status. Use deterministic source keys and a local ID ledger so rerunning extraction does not silently duplicate or overwrite cases.
2. Apply only approved changes. For an existing item with changed content, propose a new version instead of silently altering a benchmark in use. After ambiguous writes, read back before retrying; do not assume POST is idempotent.
3. Read back the dataset and all uploaded items with pagination and bounded retries. Check counts, IDs, field contents, provenance, and review status, not just HTTP success.
4. Freeze the item ID list plus input/reference/fixture hashes in a local manifest outside version control if sensitive. Use server-side versions only when supported and verified; otherwise use a distinct dataset name and manifest. Do not mutate a frozen set during comparisons.
5. Report draft/approved/uploaded/verified counts, duplicates and exclusions, unresolved labels, replay readiness, and the dataset ID/name plus verified link if available. State which items are eligible for each evaluator before handing off to experiments.
