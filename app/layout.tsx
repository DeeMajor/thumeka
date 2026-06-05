import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { CartIcon } from "@/components/cart-icon";
import { CartProvider } from "@/components/cart-provider";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
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
    "South Africa's safest and most empowering marketplace — products, services, errands, and deliveries.",
  icons: {
    icon: [
      { url: "/thumeka.png", type: "image/png" }
    ],
    apple: "/thumeka.png"
  },
  openGraph: {
    title: "Thumeka",
    description:
      "South Africa's safest and most empowering marketplace — products, services, errands, and deliveries.",
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
        className="flex min-h-screen flex-col font-sans text-body text-ink antialiased"
        suppressHydrationWarning
      >
        <CartProvider>
        <header
          className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur"
          data-testid="site-header"
        >
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Left cluster: logo + inline nav (Takealot-style) */}
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold"
                data-testid="nav-home-link"
              >
                <span className="brand-mark h-12 w-12">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`${APP_NAME} logo`}
                    className="h-full w-full object-contain"
                    src="/thumeka.png"
                  />
                </span>
              </Link>
              <nav
                aria-label="Primary"
                className="hidden items-center gap-4 text-sm font-medium text-ink sm:flex"
                data-testid="desktop-primary-nav"
              >
                <Link
                  className="transition hover:text-leaf"
                  data-testid="nav-support-link"
                  href="/support"
                >
                  Support
                </Link>
                <span aria-hidden="true" className="h-5 w-px bg-black/15" />
                <Link
                  className="transition hover:text-leaf"
                  data-testid="nav-sell-link"
                  href="/auth/register"
                >
                  Sell on {APP_NAME}
                </Link>
                <span aria-hidden="true" className="h-5 w-px bg-black/15" />
                <Link
                  className="transition hover:text-leaf"
                  data-testid="nav-drive-link"
                  href="/auth/register"
                >
                  Drive for {APP_NAME}
                </Link>
              </nav>
            </div>

            {/* Right cluster: cart + auth links, text-style with separators */}
            <nav
              aria-label="Account"
              className="hidden items-center gap-4 text-sm font-medium text-ink sm:flex"
              data-testid="desktop-nav"
            >
              <CartIcon />
              <span aria-hidden="true" className="h-5 w-px bg-black/15" />
              {profile ? (
                <>
                  <Link
                    className="transition hover:text-leaf"
                    href={roleHomePath(profile.role)}
                    data-testid="nav-dashboard-link"
                  >
                    Dashboard
                  </Link>
                  <span aria-hidden="true" className="h-5 w-px bg-black/15" />
                  <Link
                    className="transition hover:text-leaf"
                    href="/auth/sign-out"
                    data-testid="nav-sign-out-link"
                  >
                    Sign out
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    className="transition hover:text-leaf"
                    href="/auth/sign-in"
                    data-testid="nav-sign-in-link"
                  >
                    Sign in
                  </Link>
                  <span aria-hidden="true" className="h-5 w-px bg-black/15" />
                  <Link
                    className="transition hover:text-leaf"
                    href="/auth/register"
                    data-testid="nav-register-link"
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
            {/* Mobile cluster: cart icon stays out of the dropdown so it's
                always one tap away even when the menu is closed. */}
            <div className="flex items-center gap-1 sm:hidden">
              <CartIcon />
              <MobileNavMenu>
              <Link className="btn-secondary" href="/" data-testid="mobile-nav-browse-link">
                Browse
              </Link>
              <Link className="btn-secondary" href="/support" data-testid="mobile-nav-support-link">
                Support
              </Link>
              <Link
                className="btn-secondary"
                data-testid="mobile-nav-sell-link"
                href="/auth/register"
              >
                Sell on {APP_NAME}
              </Link>
              <Link
                className="btn-secondary"
                data-testid="mobile-nav-drive-link"
                href="/auth/register"
              >
                Drive for {APP_NAME}
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
            </MobileNavMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 pb-20 sm:pb-0" data-testid="app-main">
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
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
            <div>
              <div className="flex items-center gap-2 font-semibold text-ink">
                <span className="brand-mark h-10 w-10">
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
                A national marketplace for products, services, and errands.
              </p>
            </div>
            <div>
              <p className="text-caption font-semibold uppercase tracking-widest text-black/40">
                Marketplace
              </p>
              <ul className="mt-3 space-y-2 text-body-sm">
                <li>
                  <Link className="text-ink hover:text-leaf" href="/">
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
              <ul className="mt-3 space-y-2 text-body-sm">
                <li>
                  <Link className="text-ink hover:text-leaf" href="/terms">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link className="text-ink hover:text-leaf" href="/privacy">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-black/10">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 text-caption text-black/45 sm:px-6 lg:px-8">
              <span>
                &copy; {new Date().getFullYear()} {APP_NAME}. Built in South Africa.
              </span>
              <span>en-ZA</span>
            </div>
          </div>
        </footer>
        </CartProvider>
      </body>
    </html>
  );
}
