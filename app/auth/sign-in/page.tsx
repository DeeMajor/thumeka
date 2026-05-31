import type { Metadata } from "next";
import Link from "next/link";
import { LogIn } from "lucide-react";

import { signInAction } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Sign in"
};

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    registered?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

  return (
    <div className="section-band" data-testid="page-sign-in">
      <div className="page-shell max-w-xl py-8">
        <div className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-mint text-leaf">
            <LogIn className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-display-md text-ink">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-black/60">
            Access your buyer orders, provider listings, driver deliveries, or admin workspace.
          </p>
        </div>

        {params.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}
        {params.registered ? (
          <div className="mb-4 rounded-md border border-mint bg-mint p-3 text-sm text-leaf">
            Account created. Sign in once email confirmation is complete.
          </div>
        ) : null}

        <form action={signInAction} className="panel space-y-4" data-testid="sign-in-form">
          <input name="next" type="hidden" value={params.next ?? ""} />
          <label className="block space-y-1">
            <span className="label">Email</span>
            <input
              autoComplete="email"
              className="input"
              data-testid="sign-in-email-input"
              inputMode="email"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block space-y-1">
            <span className="label">Password</span>
            <input
              autoComplete="current-password"
              className="input"
              data-testid="sign-in-password-input"
              name="password"
              required
              type="password"
            />
          </label>
          <button className="btn-primary w-full" data-testid="sign-in-submit-button" type="submit">
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-black/60">
          Need an account?{" "}
          <Link className="font-semibold text-leaf" data-testid="sign-in-register-link" href="/auth/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
