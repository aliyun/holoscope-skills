---
name: holoscope-setting-up-evals
description: Set up evaluation on HoloScope by finding gaps across signal capture, monitoring, built-in evaluators, and custom evaluator metrics, then addressing the right one first.
metadata:
  required_access:
    - HOLOSCOPE_PROJECT_INTERFACE
---

# Setting up evals

- **Act as executor and teacher.** Do the work and, above all, explain why the approach fits the user's goal and data.
- **Teach decision-making, not configuration.** Explain the reasoning, tradeoffs, and limitations—not sampling rates, targets, score types, or other setup details. The response must leave the user able to repeat or change the approach and make future decisions without you.

Always read [Choosing what to evaluate](https://langfuse.com/academy/evaluate/choosing-what-to-evaluate) and [Evaluation](https://langfuse.com/academy/evaluate). Use their guidance to interpret their project, but do not return it as a generic setup plan.

If the user has a precise metric, skip to **Build the evaluator**. Otherwise, do not assume that choosing evaluator metrics is the next step.

## Find the measurement gap

Before advising:

- Inspect enough representative traces to present concrete findings of your own before asking about metrics.
- Inventory existing datasets, evaluators, traces, etc. as context; do not assume they should be reused or represent a current priority. Treat their importance as unconfirmed until the user agrees.
- **Inventory HoloScope's built-in evaluators first**: the service ships 8 Qwen-powered LLM-as-a-judge evaluators (hallucination, faithfulness, answer relevance, context relevance, context recall, toxicity, correctness, conciseness) that run automatically on live traces with per-evaluator toggles and a sampling rate — see [Agent evaluation](https://help.aliyun.com/zh/hologres/user-guide/agent-evaluation-in-holoscope). Probe `GET /api/public/unstable/evaluators`; if it 404s (v4-gated, see SKILL.md), inventory via the console instead. Built-in scores land with Title Case names (e.g. `Answer Relevance`) and `source: EVAL`; the evaluator runs themselves appear as traces under environment `langfuse-llm-as-a-judge`, so exclude that environment when inspecting application traces. Treat enabled built-ins as existing coverage; never delete them.
- Identify what is already surfaced through trace errors, logged data, existing scores, or other monitoring; what is available but not monitored; what important user or product signals are not captured; and what genuinely requires an evaluator.
- Do not ask the user for information you can inspect.
- If project access is unavailable, say so instead of substituting a generic plan.

Do not add an evaluator that duplicates an existing error, logged signal, or enabled built-in evaluator. For example, do not evaluate valid JSON when invalid JSON already produces a trace error.

Treat trace errors and logged failures as existing coverage. Unless the user wants operational monitoring, do not let them displace the search for subtler qualitative signals that are not yet captured. Do not propose alerts, paging, or release gates before asking how the measurement should be used.

Do not propose evaluating a known failure with an owner and a planned one-time fix unless the user wants to track whether it recurs.

If systematic error analysis is the right next step, explain why and ask whether the user wants it; if they agree, run it by inspecting traces directly — sample recent traces, label failure modes yourself, confirm the taxonomy with the user — and do not start metric selection until that analysis is complete.

## Define the metric set

Existing project materials inform the questions you'll ask; it does not determine what the user values.

When forming tentative recommendations:

- Start with direct evidence of user or product outcomes, recurring failures visible in traces or user reactions, and important signals the application is not yet capturing.
- Prefer quick wins: signals that are application-specific, actionable, reasonably reliable to start measuring. A good example signal is user (dis)satisfaction.
- Recommend metrics only for problems evidenced in current data. A behavior being common or theoretically risky is not a reason to run an evaluator.
- For live evaluation, recommend only metrics that can be scored from the available live data without ground truth; never suggest a metric that requires knowing the correct answer, expected outcome, or ideal resolution.
- Do not propose generic starting metrics such as `helpfulness`, `quality`, `relevance`, `hallucination`, `groundedness`, `task completion`, `task success`, or `reliability` as NEW custom evaluators — the built-ins already cover the generic ground.
- Before presenting any metric, verify that it can actually be measured using the available data and the evaluator inputs supported by the unstable API. If not, identify what must be captured instead.
- Explain why each recommendation deserves attention before the alternatives, then ask the user whether that priority matches their goals.

When specific failures or hard requirements are known and metric selection is the next task, ask focused, dependent questions about which ones matter and what decisions their measurement should support. Give a recommendation grounded in the project, leave the decision to the user, and wait for their answer.

Do not treat any metric as selected, choose evaluator types, ask implementation questions, or implement anything until the user has answered and explicitly confirmed the metric set.

## Build the evaluator

For evaluator functionality, use the unstable API endpoints (`/api/public/unstable/evaluators`, `/api/public/unstable/evaluation-rules`). If they 404 (v4-gated backend, see SKILL.md), configure evaluators in the HoloScope console instead.

Follow [Writing good evaluators](https://langfuse.com/academy/evaluate/writing-evaluators) to choose the evaluator type; do not always default to an LLM-as-a-judge.

- Before creating the evaluator, verify its target filter by fetching the observations it actually matches. Confirm the set is exactly what you intend—no duplicates that would be scored (and billed) twice.
- Prioritize a clean score name: it is the metric that lands on every observation, so name it after what is measured (`refusal`), not after the evaluator (`refusal judge`). Keep any evaluator-mechanism wording out of the score name.
- Explain why the chosen evaluation method measures the intended behavior, what evidence it relies on, what it cannot tell the user, and when another method would be better.
- When methods have significant trade-offs and none is clearly superior, explain the options and let the user decide before implementation.
- Only if an LLM-as-a-judge is the best fit, calibrate it on real examples before treating it as ready. You can do this by running an experiment on a dataset where the prompt being tested is the LLM-as-a-judge prompt.
- Share a link to the evaluator.
