import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const feedbackFormUrl = "https://tally.so/r/rD5oVX";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "Learn how Physcratic handles account and profile information and how to send a privacy request.",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 md:py-16">
      <Button variant="ghost" className="min-h-11 w-fit" asChild>
        <Link href="/terms"><ArrowLeft aria-hidden="true" /> Back to Terms of Service</Link>
      </Button>
      <header className="flex flex-col gap-3">
        <h1 className="text-balance text-3xl font-semibold md:text-4xl">Privacy Notice</h1>
        <p className="text-sm text-muted-foreground">Effective <time dateTime="2026-11-21">November 21, 2026</time></p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Arrow Kristian operates Physcratic, an online platform, in a personal capacity. This notice covers accounts, text profiles and privacy requests.
        </p>
      </header>
      <article className="flex flex-col gap-8 text-base leading-relaxed text-muted-foreground">
        <section aria-labelledby="privacy-accounts" className="flex flex-col gap-3">
          <h2 id="privacy-accounts" className="text-xl font-semibold text-foreground">Accounts and sign-in</h2>
          <p>
            When you create an account, we collect your name and email, store a hashed password, and record the version
            of the Terms you accepted and when. We use your email to verify your account and send account messages,
            such as password reset links. When you use signed-in features, we associate what you save, such as problem
            attempts and notes, with your account.
          </p>
          <p>
            We use a session cookie to keep you signed in. Session records can include your IP address and browser
            information. We use request limits and security reporting to protect the service and investigate errors.
          </p>
        </section>
        <section aria-labelledby="privacy-profiles" className="flex flex-col gap-3">
          <h2 id="privacy-profiles" className="text-xl font-semibold text-foreground">Community profiles</h2>
          <p>
            When community profiles are available, new users choose a public username during registration. Their
            pseudonymous profile becomes public after email verification. Existing accounts stay private until the
            owner acknowledges the publication notice and chooses to publish.
          </p>
          <p>
            A public text profile shows your username, display name, biography, education level and favourite topics.
            The display name defaults to your username. Your private registration name, email, internal account ID
            and session details stay private. Your public name can appear beside your published problems.
          </p>
          <p>
            Physcratic keeps an account-linked edit counter to enforce a limit of 10 profile edit requests per minute.
          </p>
        </section>
        <section aria-labelledby="privacy-withdrawal" className="flex flex-col gap-3">
          <h2 id="privacy-withdrawal" className="text-xl font-semibold text-foreground">Hide your profile</h2>
          <p>
            Choose Deactivate public profile in Settings to hide your profile and public author name from new requests.
            Your username, saved details, publication record and edit-limit record remain stored. Settings does not
            offer reactivation.
            People who already saw or copied it may keep a copy.
          </p>
        </section>
        <section aria-labelledby="privacy-providers" className="flex flex-col gap-3">
          <h2 id="privacy-providers" className="text-xl font-semibold text-foreground">Service providers</h2>
          <p>
            Vercel hosts Physcratic, Neon stores account and profile records, and Resend delivers account emails.
            Where enabled, Google reCAPTCHA checks sign-up requests for automated activity. The site uses Vercel Web
            Analytics to measure visits. Tally processes what you enter in the feedback form, including an email
            address if you supply one.
          </p>
        </section>
        <section aria-labelledby="privacy-retention" className="flex flex-col gap-3">
          <h2 id="privacy-retention" className="text-xl font-semibold text-foreground">Retention and deletion</h2>
          <p>
            If Delete account is available in Settings, you can use it to remove your sign-in and ordinary private
            account data from the live service. Files can still be awaiting cleanup after the account is gone. The
            receipt shows the status of files queued for deletion. Approved evidence or published work with
            permission to remain on the site can be retained.
          </p>
          <p>
            We handle Tally submissions and related copies separately. Information in restricted backup or recovery copies
            can remain after deletion from the live service. We may keep a restricted record of a request so we can
            follow up on pending cleanup and reconcile deletions during recovery.
          </p>
          <p>
            Use the feedback form below if you want to request deletion, can’t sign in or check your receipt, or
            need help with pending cleanup.
          </p>
        </section>
        <section aria-labelledby="privacy-requests" className="flex flex-col gap-3">
          <h2 id="privacy-requests" className="text-xl font-semibold text-foreground">Privacy requests and abuse reports</h2>
          <p>
            You can change your email in account settings and edit your profile in Settings when profiles are available.
            Use the feedback form to ask about access, correction or deletion, report profile abuse, or request removal
            of public content. In “What happened?”, describe the request and say if the exposure is urgent. Include the
            public profile link or handle when relevant. Keep passwords, verification codes and deletion request tokens out of the form.
          </p>
          <p>
            The email field is optional. Enter an email address you can access if you need a reply or account
            verification. Before sharing or changing account information, the operator verifies that you control the
            email address registered to the account or uses another secure way to verify your authority.
          </p>
          <p>
            For urgent unsafe exposure, the operator can temporarily disable community profiles across the site while
            reviewing the report. Turning profiles off leaves saved data in place.
          </p>
          <Button variant="outline" className="min-h-11 w-fit max-w-full text-wrap" asChild>
            <a href={feedbackFormUrl} rel="noreferrer">Open the feedback form on Tally</a>
          </Button>
        </section>
      </article>
    </main>
  );
}
