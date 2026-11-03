// Match the reported call site, not merely the presence of Zod in a chunk.
// Unknown eval sites remain unexplained and fail the harness.
export function evalAttribution(event, source) {
  if (event.blocked !== 'eval') return undefined;
  if (event.asset === '/__csp/zod.js') return 'controlled Zod fixture';
  const line = source?.split('\n')[event.line - 1];
  if (!line) return 'unexplained eval';
  const context = line.slice(Math.max(0, event.column - 100), event.column + 150);
  if (/try\{return Function\(""\),!0\}catch/.test(context)) return 'Zod allowsEval caught probe';
  if (/Object\.keys\(this\.closed\)/.test(context) && /this\.content/.test(context)) return 'Zod schema JIT code generator';
  return 'unexplained eval';
}
