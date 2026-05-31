import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Shirt,
  Sparkles,
  SprayCan,
  Store,
  Truck,
  UtensilsCrossed,
  Wrench
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { roleHomePath } from "@/lib/routes";

export const dynamic = "force-dynamic";

const CATEGORIES: { name: string; icon: typeof MapPin }[] = [
  { name: "Food", icon: UtensilsCrossed },
  { name: "Groceries", icon: ShoppingBasket },
  { name: "Clothing", icon: Shirt },
  { name: "Beauty", icon: Sparkles },
  { name: "Home services", icon: Wrench },
  { name: "Cleaning", icon: SprayCan }
];

const WHY_THUMEKA = [
  {
    icon: MapPin,
    title: "Built for Durban",
    body: "Every seller and driver is local. Listings stay in your suburb, not someone else's."
  },
  {
    icon: ShieldCheck,
    title: "Pay only when accepted",
    body: "EFT instructions are unlocked after the seller accepts. No payment held against air."
  },
  {
    icon: Truck,
    title: "Approved drivers, real delivery",
    body: "Distance and fee calculated up front. You see the total before you commit."
  }
];

const HOW_BUY = [
  "Browse approved Durban listings",
  "Get a delivery quote at checkout",
  "Pay by EFT after the seller accepts"
];
const HOW_SELL = [
  "Apply with your business details",
  "List products, services, or errands",
  "Accept orders — earnings go to your bank"
];
const HOW_DRIVE = [
  "Register with vehicle + payout details",
  "Go online when you're available",
  "Pick up, deliver, get paid weekly"
];

export default async function HomePage() {
  const profile = await getCurrentProfile().catch(() => null);

  return (
    <div className="bg-mist" data-testid="page-home">
      {/* Hero */}
      <section className="section-band">
        <div className="page-shell gap-10 py-14 sm:py-20">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-caption font-semibold uppercase tracking-widest text-leaf">
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              Durban marketplace
            </span>
            <h1 className="max-w-3xl text-display-lg sm:text-display-xl">
              Durban,{" "}
              <span className="text-brand-gradient">delivered.</span>
            </h1>
            <p className="max-w-2xl text-body text-black/65 sm:text-base sm:leading-7">
              A marketplace for products, services, and errands &mdash; paid by EFT,
              delivered by approved drivers. From food to fixes, find what
              Durban&apos;s makers and pros do best.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row" data-testid="home-cta-group">
              <Link
                className="btn-primary px-6"
                data-testid="home-browse-link"
                href="/listings"
              >
                Browse marketplace
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              {profile ? (
                <Link
                  className="btn-secondary px-6"
                  data-testid="home-dashboard-link"
                  href={roleHomePath(profile.role)}
                >
                  Go to dashboard
                </Link>
              ) : (
                <Link
                  className="btn-secondary px-6"
                  data-testid="home-sell-link"
                  href="/auth/register"
                >
                  Become a seller
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why Thumeka */}
      <section className="page-shell py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {WHY_THUMEKA.map(({ icon: Icon, title, body }) => (
            <div className="panel" key={title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mint text-leaf">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-h3 text-ink">{title}</h3>
              <p className="mt-2 text-body-sm text-black/60">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories preview */}
      <section className="page-shell py-12">
        <div className="dash-section-label">
          <span className="label-text">Browse by category</span>
          <span className="label-rule" />
          <Link
            className="text-caption font-semibold uppercase tracking-widest text-leaf hover:text-ink"
            data-testid="home-categories-all-link"
            href="/listings"
          >
            See all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(({ name, icon: Icon }) => (
            <Link
              className="group flex items-center gap-4 rounded-lg border border-black/10 bg-white p-4 transition hover:border-leaf hover:shadow-soft"
              data-testid="home-category-link"
              href={`/listings?category=${encodeURIComponent(name)}`}
              key={name}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-mint text-leaf">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-h3 text-ink">{name}</p>
                <p className="text-body-sm text-black/55">Explore listings</p>
              </div>
              <ArrowRight
                className="h-4 w-4 text-black/30 transition group-hover:translate-x-0.5 group-hover:text-leaf"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section-band">
        <div className="page-shell py-14">
          <div className="max-w-2xl">
            <h2 className="text-display-md text-ink">How {APP_NAME} works</h2>
            <p className="mt-3 text-body text-black/60">
              Three sides, one marketplace. Pick yours.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <HowCard icon={ShoppingBag} title="For buyers" steps={HOW_BUY} cta="Browse listings" href="/listings" testid="home-how-buy" />
            <HowCard icon={Store} title="For sellers" steps={HOW_SELL} cta="Become a seller" href="/auth/register" testid="home-how-sell" />
            <HowCard icon={Truck} title="For drivers" steps={HOW_DRIVE} cta="Drive for us" href="/auth/register" testid="home-how-drive" />
          </div>
        </div>
      </section>

      {/* Final CTA band */}
      <section className="page-shell py-14">
        <div className="panel flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-h1 text-ink">Run your business with {APP_NAME}.</h2>
            <p className="mt-2 text-body text-black/60">
              Reach Durban buyers, ship through approved drivers, and get paid weekly.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary px-6" data-testid="home-final-sell-link" href="/auth/register">
              Sell on {APP_NAME}
            </Link>
            <Link className="btn-secondary px-6" data-testid="home-final-drive-link" href="/auth/register">
              Drive for {APP_NAME}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function HowCard({
  icon: Icon,
  title,
  steps,
  cta,
  href,
  testid
}: {
  icon: typeof MapPin;
  title: string;
  steps: string[];
  cta: string;
  href: string;
  testid: string;
}) {
  return (
    <div className="panel flex flex-col" data-testid={testid}>
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mint text-leaf">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-h2 text-ink">{title}</h3>
      <ol className="mt-4 space-y-3 text-body-sm text-black/65">
        {steps.map((step, index) => (
          <li className="flex items-start gap-3" key={step}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint text-caption font-semibold text-leaf">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <Link className="btn-secondary mt-6 w-full" href={href}>
        {cta}
      </Link>
    </div>
  );
}
