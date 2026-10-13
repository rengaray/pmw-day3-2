import { DomainError } from '../src/domain.mjs';
// Tool results become model input. Measure them and keep them inside an explicit budget.
export const DEFAULT_TOKEN_BUDGET=1500;
const LIST_FIELDS=['items','features'];
export function estimateTokens(text) {
  // LAB02_USAGE_START
  if (typeof text!=='string') throw new DomainError('INVALID_INPUT','Result text must be a string.');
  return Math.ceil(text.length/4);
  // LAB02_USAGE_END
}
export function budgetResult(value, maxTokens=DEFAULT_TOKEN_BUDGET) {
  // LAB02_BUDGET_START
  const hint='Narrow the request to retrieve fewer records.';
  const minimumBudget=estimateTokens(JSON.stringify({items:[],truncated:true,omitted:0,hint}));
  if (!Number.isInteger(maxTokens) || maxTokens<minimumBudget) throw new DomainError('INVALID_INPUT','Token budget is too small for a bounded result.');
  const serialized=JSON.stringify(value);
  if (typeof serialized!=='string') throw new DomainError('INVALID_INPUT','Result must be JSON serializable.');
  if (estimateTokens(serialized)<=maxTokens) return {value,truncated:false};

  const field=LIST_FIELDS.find(key=>Array.isArray(value?.[key]));
  if (!field) throw new DomainError('RESULT_TOO_LARGE','Tool result exceeds the token budget.',413);

  const items=value[field];
  for (let length=items.length-1;length>=0;length--) {
    const truncatedValue={...value,[field]:items.slice(0,length),truncated:true,omitted:items.length-length,hint};
    const truncatedText=JSON.stringify(truncatedValue);
    if (estimateTokens(truncatedText)<=maxTokens) return {value:truncatedValue,truncated:true};
  }
  throw new DomainError('RESULT_TOO_LARGE','Tool result exceeds the token budget.',413);
  // LAB02_BUDGET_END
}
export function usageRecord({tool,args={},text,durationMs,isError=false,truncated=false}) {
  // LAB02_RECORD_START
  if (!args || typeof args!=='object' || Array.isArray(args)) throw new DomainError('INVALID_INPUT','Tool arguments must be an object.');
  if (typeof text!=='string') throw new DomainError('INVALID_INPUT','Result text must be a string.');
  if (typeof durationMs!=='number' || !Number.isFinite(durationMs) || durationMs<0) throw new DomainError('INVALID_INPUT','Duration must be a non-negative number.');
  return {
    ts:new Date().toISOString(),
    tool,
    argKeys:Object.keys(args).sort(),
    resultBytes:Buffer.byteLength(text),
    estTokens:estimateTokens(text),
    durationMs:Math.round((durationMs+Number.EPSILON)*100)/100,
    isError,
    truncated
  };
  // LAB02_RECORD_END
}
