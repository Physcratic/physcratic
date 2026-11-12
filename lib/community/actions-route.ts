import 'server-only';
import { communityActionsEnabled } from './action-policy';
import { profileReply } from './profile-api';

export function createActionsRoute(enabled = communityActionsEnabled, load = () => import('./actions-server')) {
  return async (request: Request) => {
    if (!enabled()) return profileReply({ error: 'Staff actions are disabled.' }, 503);
    try { return await (await load()).actionsApi(request); }
    catch { return profileReply({ error: 'Staff actions are temporarily unavailable.' }, 503); }
  };
}
