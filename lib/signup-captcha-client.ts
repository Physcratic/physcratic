import { SIGNUP_CAPTCHA_ACTION } from "./signup-captcha-action";

type Recaptcha = {
  ready: (callback: () => void) => void;
  execute: (key: string, options: { action: string }) => Promise<string>;
};
declare global { interface Window { grecaptcha?: Recaptcha } }
let loading: Promise<void> | undefined;

function load(key: string) {
  if (window.grecaptcha) return Promise.resolve();
  if (!loading) {
    const attempt = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(() => { script.remove(); reject(new Error("CAPTCHA unavailable")); }, 15000);
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
      script.async = true;
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("CAPTCHA unavailable")); };
      document.head.appendChild(script);
    });
    loading = attempt.catch((error) => { loading = undefined; throw error; });
  }
  return loading;
}

export async function getSignupCaptchaToken() {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (!key) throw new Error("CAPTCHA unavailable");
  // Bound loading, ready and execute together; retries always call execute again.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        await load(key);
        const api = window.grecaptcha;
        if (!api) throw new Error("CAPTCHA unavailable");
        await new Promise<void>((resolve) => api.ready(resolve));
        const token = await api.execute(key, { action: SIGNUP_CAPTCHA_ACTION });
        if (!token) throw new Error("CAPTCHA unavailable");
        return token;
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("CAPTCHA unavailable")), 20000); }),
    ]);
  } catch {
    loading = undefined;
    throw new Error("CAPTCHA unavailable");
  } finally { clearTimeout(timer); }
}
