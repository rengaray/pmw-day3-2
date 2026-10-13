import { DomainError } from '../src/domain.mjs';
// Tool results become model input. Measure them and keep them inside an explicit budget.
export const DEFAULT_TOKEN_BUDGET=1500;
const LIST_FIELDS=['items','features'];
export function estimateTokens(text) {
  // LAB02_USAGE_START
  return 0; // TODO estimate tokens with the agreed characters-per-token heuristic.
  // LAB02_USAGE_END
}
export function budgetResult(value, maxTokens=DEFAULT_TOKEN_BUDGET) {
  // LAB02_BUDGET_START
  return {value,truncated:false}; // TODO enforce the token budget on list results and fail closed otherwise.
  // LAB02_BUDGET_END
}
export function usageRecord({tool,args={},text,durationMs,isError=false,truncated=false}) {
  // LAB02_RECORD_START
  return {ts:new Date().toISOString(),tool}; // TODO record sizes, estimate, duration and outcome without argument values or result text.
  // LAB02_RECORD_END
}
