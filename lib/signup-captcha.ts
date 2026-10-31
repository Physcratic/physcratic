import { captcha } from "better-auth/plugins";

import { SIGNUP_CAPTCHA_ACTION } from "./signup-captcha-action";

// Always install the plugin: incomplete configuration must never disable protection.
export function signupCaptcha(env: Record<string, string | undefined> = process.env) {
  const secretKey = env.RECAPTCHA_SECRET_KEY?.trim();
  const allowedHostnames = env.RECAPTCHA_ALLOWED_HOSTNAMES?.split(",").map((host) => host.trim()).filter(Boolean) ?? [];
  const configured = Boolean(secretKey && allowedHostnames.length);
  const plugin = captcha({
    provider: "google-recaptcha",
    secretKey: configured ? secretKey! : "",
    endpoints: ["/sign-up/email"],
    minScore: 0.5,
    expectedAction: SIGNUP_CAPTCHA_ACTION,
    allowedHostnames,
  });
  const verify = plugin.onRequest;
  return {
    ...plugin,
    onRequest: (async (request, ctx) => {
      // Use the plugin's own path normalization/matching, including trailing slashes.
      // A missing secret is caught by the plugin and fails closed, as does an empty allow-list here.
      return verify(request, {
        ...ctx,
        // The upstream catch includes raw errors and request URLs. Return its generic error only.
        logger: { ...ctx.logger, error: () => {} },
      });
    }) as typeof verify,
  };
}
