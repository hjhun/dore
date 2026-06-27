# Hermes Agent Loop Gap Analysis

Date: 2026-06-27

Reference inspected: `../ref/hermes-agent`.

## Summary

Dore has development workflow visibility through M21, but Hermes has deeper
agent-loop reliability primitives around each turn. The useful gap is not a
larger autonomous executor yet; it is explicit loop state, budget accounting,
retry guards, tool-result proof, and finalization diagnostics that make stalls
and over-claims visible.

## Hermes Reference Points

- `agent/turn_context.py`: builds per-turn context before the loop starts.
- `agent/iteration_budget.py`: tracks consumed and remaining loop iterations.
- `agent/turn_retry_state.py`: names one-shot retry guards for recovery paths.
- `agent/tool_result_classification.py`: proves whether file mutations landed.
- `agent/tool_guardrails.py`: detects repeated failures and no-progress loops.
- `agent/turn_finalizer.py`: records why a turn ended and surfaces abnormal
  endings.
- `website/docs/developer-guide/agent-loop.md`: documents the turn lifecycle,
  message alternation, interrupt handling, tool execution, budget, fallback,
  compression, and persistence surfaces.

## Dore Gaps

| Area | Current Dore state | Gap |
| --- | --- | --- |
| Loop state | M21 exposes workflow stages. | No explicit per-task loop status with budget, retry guards, exit reason, and next action. |
| Retry bookkeeping | Failed verification summaries exist. | Retry attempts are not modeled as one-shot guards. |
| Tool-result proof | Controlled file edits log applied edits. | File mutation results are not classified into landed/failed proof for loop diagnostics. |
| Loop guardrails | Risk reviews gate broad/destructive/external actions. | Repeated same-failure/no-progress loops are not detected or surfaced. |
| Turn finalization | Task status and failure summaries exist. | Abnormal endings do not have a consolidated finalizer status. |
| Background review | Memory reflection exists at task completion. | No cadence-based background review after loop/tool activity. |

## M22 Direction

M22 should improve agent-loop reliability in small vertical slices:

1. expose development-agent loop status from daemon and desktop.
2. add tool-result proof helpers for controlled mutations.
3. add repeated failure/no-progress guardrail summaries.
4. add a turn-finalizer summary for abnormal stops.
5. add a background review trigger record once loop activity crosses a small,
   deterministic threshold.

Real trading remains unrelated and blocked by M16/M17 broker inputs.
