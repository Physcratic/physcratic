import 'server-only';
import type { PracticeCheckAction } from './practice-check-api';

export function practiceChecksEnabled(env: Record<string, string | undefined> = process.env) {
  return env.PRACTICE_CHECKS_ENABLED === 'true';
}

function unavailable(action: PracticeCheckAction, disabled = false) {
  return Response.json({
    error: disabled ? 'Saved practice checks are disabled.' : 'Saved practice checks are temporarily unavailable.',
    ...(action === 'submit' ? { saveState: 'unconfirmed' } : {}),
  }, { status: 503, headers: {
    'Cache-Control': 'private, no-store',
    'Vary': 'Cookie, X-Practice-Account',
    'X-Content-Type-Options': 'nosniff',
  } });
}

// Check server configuration before importing any database or session bindings.
export function createPracticeCheckRoute(
  enabled = practiceChecksEnabled,
  load = () => import('./practice-check-server'),
) {
  return async (action: PracticeCheckAction, request: Request): Promise<Response> => {
    if (!enabled()) return unavailable(action, true);
    try { return await (await load()).practiceCheckApi(action, request); }
    catch { return unavailable(action); }
  };
}

export const practiceCheckRoute = createPracticeCheckRoute();
