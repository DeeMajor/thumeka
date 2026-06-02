import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { Menu } from "lucide-react";

import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { getCurrentProfile } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { getAppUrl } from "@/lib/env";
import { roleHomePath } from "@/lib/routes";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "Thumeka",
    template: "%s | Thumeka"
  },
  description:
    "Durban-only marketplace for products, services, errands, and deliveries.",
  icons: {
    icon: [
      { url: "/thumeka.png", type: "image/png" }
    ],
    apple: "/thumeka.png"
  },
  openGraph: {
    title: "Thumeka",
    description:
      "Durban-only marketplace for products, services, errands, and deliveries.",
    images: ["/thumeka.png"]
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile().catch(() => null);
  return (
    <html lang="en-ZA" className={jakarta.variable} suppressHydrationWarning>
      <body
        className="font-sans text-body text-ink antialiased"
        suppressHydrationWarning
      >
        <header
          className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur"
          data-testid="site-header"
        >
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold"
              data-testid="nav-home-link"
            >
              <span className="brand-mark h-9 w-9">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${APP_NAME} logo`}
                  className="h-full w-full object-contain"
                  src="/thumeka.png"
                />
              </span>
              <span className="text-brand-gradient">{APP_NAME}</span>
            </Link>
            <nav className="hidden items-center gap-2 sm:flex" data-testid="desktop-nav">
              <Link className="btn-secondary" href="/listings" data-testid="nav-listings-link">
                Browse
              </Link>
              <Link className="btn-secondary" href="/support" data-testid="nav-support-link">
                Support
              </Link>
              {profile ? (
                <>
                  <Link
                    className="btn-secondary"
                    href={roleHomePath(profile.role)}
                    data-testid="nav-dashboard-link"
                  >
                    Dashboard
                  </Link>
                  <Link className="btn-primary" href="/auth/sign-out" data-testid="nav-sign-out-link">
                    Sign out
                  </Link>
                </>
              ) : (
                <Link className="btn-primary" href="/auth/sign-in" data-testid="nav-sign-in-link">
                  Sign in
                </Link>
              )}
            </nav>
            <details className="relative sm:hidden" data-testid="mobile-nav-menu">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-black/15 bg-white"
                data-testid="mobile-nav-toggle"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Menu</span>
              </summary>
              <div className="absolute right-0 mt-2 flex w-44 flex-col gap-2 rounded-lg border border-black/10 bg-white p-2 shadow-soft">
                <Link className="btn-secondary" href="/listings" data-testid="mobile-nav-listings-link">
                  Browse
                </Link>
                <Link className="btn-secondary" href="/support" data-testid="mobile-nav-support-link">
                  Support
                </Link>
                {profile ? (
                  <>
                    <Link
                      className="btn-secondary"
                      href={roleHomePath(profile.role)}
                      data-testid="mobile-nav-dashboard-link"
                    >
                      Dashboard
                    </Link>
                    <Link
                      className="btn-primary"
                      href="/auth/sign-out"
                      data-testid="mobile-nav-sign-out-link"
                    >
                      Sign out
                    </Link>
                  </>
                ) : (
                  <Link className="btn-primary" href="/auth/sign-in" data-testid="mobile-nav-sign-in-link">
                    Sign in
                  </Link>
                )}
              </div>
            </details>
          </div>
        </header>
        <main className="pb-20 sm:pb-0" data-testid="app-main">
          {children}
        </main>
        {profile ? (
          <BottomNav
            dashboardHref={roleHomePath(profile.role)}
            email={profile.email}
            role={profile.role}
          />
        ) : null}
        <footer
          className="mt-12 border-t border-black/10 bg-white"
          data-testid="site-footer"
        >
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
            <div>
              <div className="flex items-center gap-2 font-semibold text-ink">
                <span className="brand-mark h-8 w-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`${APP_NAME} logo`}
                    className="h-full w-full object-contain"
                    src="/thumeka.png"
                  />
                </span>
                <span>{APP_NAME}</span>
              </div>
              <p className="mt-3 text-body-sm text-black/55">
                Durban&apos;s marketplace for products, services, and errands.
              </p>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-widest text-black/40">
                Marketplace
              </p>
              <ul className="mt-3 space-y-2 text-body-sm">
                <li>
                  <Link className="text-ink hover:text-leaf" href="/listings">
                    Browse listings
                  </Link>
                </li>
                <li>
                  <Link className="text-ink hover:text-leaf" href="/auth/register">
                    Become a seller
                  </Link>
                </li>
                <li>
                  <Link className="text-ink hover:text-leaf" href="/auth/register">
                    Drive for {APP_NAME}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-widest text-black/40">
                Support
              </p>
              <ul className="mt-3 space-y-2 text-body-sm">
                <li>
                  <Link className="text-ink hover:text-leaf" href="/support">
                    WhatsApp support
                  </Link>
                </li>
                <li>
                  <Link className="text-ink hover:text-leaf" href="/auth/sign-in">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-widest text-black/40">
                Legal
              </p>
              <ul className="mt-3 space-y-2 text-body-sm text-black/55">
                <li>Terms (coming soon)</li>
                <li>Privacy (coming soon)</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-black/10">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 text-caption text-black/45 sm:px-6 lg:px-8">
              <span>
                &copy; {new Date().getFullYear()} {APP_NAME}. Built for Durban.
              </span>
              <span>en-ZA</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
