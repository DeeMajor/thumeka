import Link from "next/link";
import {
  ArrowRight,
  Clock,
  MapPin,
  Search,
  ShoppingBag
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ListingImage } from "@/components/listing-image";
import { getCurrentProfile } from "@/lib/auth";
import { APP_NAME, SEEDED_CATEGORIES } from "@/lib/constants";
import type { CategoryRow, ListingRow } from "@/lib/database.types";
import { formatMoney, titleCase } from "@/lib/format";
import { roleHomePath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

async function getMarketplaceData(categoryName: string | undefined) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const categoryList = (categories ?? []) as CategoryRow[];
    const matchedCategory = categoryName
      ? categoryList.find(
          (category) =>
            category.name.toLowerCase() === categoryName.toLowerCase()
        )
      : undefined;

    let listingsQuery = supabase
      .from("listings")
      .select(
        `*,
         provider:provider_profiles!listings_provider_id_fkey ( business_name )`
      )
      .eq("is_active", true)
      .eq("admin_disabled", false)
      .order("created_at", { ascending: false })
      .limit(24);

    if (matchedCategory) {
      listingsQuery = listingsQuery.eq("category_id", matchedCategory.id);
    }

    const { data: listings } = await listingsQuery;

    return {
      listings: (listings ?? []) as unknown as HomeListingRow[],
      categories: categoryList,
      matchedCategory,
      configured: true
    };
  } catch {
    return {
      listings: [] as HomeListingRow[],
      categories: [] as CategoryRow[],
      matchedCategory: undefined,
      configured: false
    };
  }
}

// Marketplace cards show the seller's business name under the title; the
// provider join is page-local so we don't widen the shared ListingRow type.
type HomeListingRow = ListingRow & {
  provider: { business_name: string | null } | null;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const activeCategory = params.category;
  const [{ listings, categories, matchedCategory, configured }, profile] =
    await Promise.all([
      getMarketplaceData(activeCategory),
      getCurrentProfile().catch(() => null)
    ]);

  const categoryNames = categories.length
    ? categories.map((category) => category.name)
    : SEEDED_CATEGORIES;
  const categoriesById = new Map(
    categories.map((category) => [category.id, category])
  );

  return (
    <div className="bg-mist" data-testid="page-home">
      {/* Hero */}
      <section className="section-band">
        <div className="page-shell gap-6 py-10 sm:py-14">
          <div className="flex flex-col items-start gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-caption font-semibold uppercase tracking-widest text-leaf">
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                South Africa&apos;s safest and most empowering marketplace
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-sunset/15 px-3 py-1 text-caption font-semibold uppercase tracking-widest text-sunset"
                data-testid="home-hero-open-247-badge"
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Open 24/7!
              </span>
            </div>
            <h1 className="max-w-3xl text-display-lg sm:text-display-xl">
              Anything <span className="text-brand-gradient">delivered</span>{" "}
              within an average of 40 minutes.
            </h1>
            <p className="max-w-2xl text-body text-black/65 sm:text-base sm:leading-7">
              Products, services, and errands in one marketplace. Secure
              payments, approved-driver delivery, and trusted professionals at
              your fingertips.
            </p>
          </div>
        </div>
      </section>

      {/* Browse band: sidebar + grid */}
      <section className="page-shell py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              className="text-h1 text-ink"
              data-testid="home-browse-heading"
            >
              Browse approved listings
            </h2>
            {matchedCategory ? (
              <p className="mt-1 text-body-sm text-black/55">
                Filtered by {matchedCategory.name}
              </p>
            ) : null}
          </div>
          {profile ? (
            <Link
              className="btn-primary"
              data-testid="home-dashboard-link"
              href={roleHomePath(profile.role)}
            >
              My dashboard
            </Link>
          ) : (
            <Link
              className="btn-primary"
              data-testid="home-create-account-link"
              href="/auth/register"
            >
              Create account
            </Link>
          )}
        </div>

        {!configured ? (
          <div className="mt-4 rounded-md border border-maize/60 bg-maize/20 p-3 text-sm text-ink">
            Live listings are temporarily unavailable. Please check back
            shortly.
          </div>
        ) : null}

        {/* Mobile-only horizontal category chips */}
        <div
          aria-label="Categories"
          className="mt-5 flex gap-2 overflow-x-auto pb-1 sm:hidden"
          data-testid="home-category-chip-list"
        >
          <Link
            className={
              activeCategory
                ? "whitespace-nowrap rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/70"
                : "whitespace-nowrap rounded-md border border-leaf bg-mint px-3 py-2 text-sm font-semibold text-leaf"
            }
            data-testid="home-category-chip-all"
            href="/"
          >
            All
          </Link>
          {categoryNames.map((category) => {
            const isActive =
              activeCategory?.toLowerCase() === category.toLowerCase();
            return (
              <Link
                className={
                  isActive
                    ? "whitespace-nowrap rounded-md border border-leaf bg-mint px-3 py-2 text-sm font-semibold text-leaf"
                    : "whitespace-nowrap rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/70"
                }
                data-testid="home-category-chip"
                href={`/?category=${encodeURIComponent(category)}`}
                key={category}
              >
                {category}
              </Link>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:mt-6 sm:flex-row sm:items-start">
          {/* Desktop sidebar */}
          <aside
            aria-label="Categories"
            className="hidden w-56 shrink-0 sm:block"
            data-testid="home-category-sidebar"
          >
            <div className="sticky top-24 rounded-lg border border-black/10 bg-white p-3">
              <p className="px-2 pb-2 text-caption font-semibold uppercase tracking-widest text-black/40">
                Refine by Category
              </p>
              <ul className="space-y-0.5 text-sm">
                <li>
                  <Link
                    className={
                      activeCategory
                        ? "block rounded-md px-2 py-2 text-ink hover:bg-mist"
                        : "block rounded-md bg-mint px-2 py-2 font-semibold text-leaf"
                    }
                    data-testid="home-category-link-all"
                    href="/"
                  >
                    All
                  </Link>
                </li>
                {categoryNames.map((category) => {
                  const isActive =
                    activeCategory?.toLowerCase() === category.toLowerCase();
                  return (
                    <li key={category}>
                      <Link
                        className={
                          isActive
                            ? "block rounded-md bg-mint px-2 py-2 font-semibold text-leaf"
                            : "block rounded-md px-2 py-2 text-ink hover:bg-mist"
                        }
                        data-testid="home-category-link"
                        href={`/?category=${encodeURIComponent(category)}`}
                      >
                        {category}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Right pane: search + grid */}
          <div className="min-w-0 flex-1">
            <form
              className="flex gap-2 rounded-lg border border-black/10 bg-white p-2"
              data-testid="home-search-form"
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 px-2">
                <Search
                  aria-hidden="true"
                  className="h-4 w-4 flex-none text-black/45"
                />
                <span className="sr-only">Search listings</span>
                <input
                  className="min-h-10 w-full bg-transparent text-sm outline-none"
                  data-testid="home-search-input"
                  defaultValue={params.q ?? ""}
                  name="q"
                  placeholder="Search food, repairs, errands"
                />
              </label>
              {activeCategory ? (
                <input
                  name="category"
                  type="hidden"
                  value={activeCategory}
                />
              ) : null}
              <button
                className="btn-secondary px-3"
                data-testid="home-search-button"
                type="submit"
              >
                Search
              </button>
            </form>

            {listings.length ? (
              <div className="mobile-grid mt-5">
                {listings.map((listing) => (
                  <Link
                    className="rounded-lg border border-black/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-leaf"
                    data-testid="listing-card"
                    href={`/listings/${listing.id}`}
                    key={listing.id}
                  >
                    <ListingImage
                      alt={listing.title}
                      className="relative mb-4 aspect-[4/3] overflow-hidden rounded-md"
                      storagePath={listing.image_url}
                    />
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="rounded-md bg-mint px-2 py-1 text-xs font-semibold text-leaf">
                        {titleCase(listing.listing_type)}
                      </span>
                      {categoriesById.get(listing.category_id) ? (
                        <span className="rounded-md bg-black/5 px-2 py-1 text-xs font-semibold text-black/60">
                          {categoriesById.get(listing.category_id)?.name}
                        </span>
                      ) : null}
                      <span className="text-sm font-semibold">
                        {formatMoney(listing.price)}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-base font-semibold">
                      {listing.title}
                    </h3>
                    {listing.provider?.business_name ? (
                      <p className="mt-1 text-caption font-medium text-black/55">
                        {listing.provider.business_name}
                      </p>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/60">
                      {listing.description}
                    </p>
                    <p className="mt-3 flex items-center gap-1 text-xs font-medium text-black/55">
                      <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                      {listing.suburb ?? "—"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  body={
                    matchedCategory
                      ? `No live listings in ${matchedCategory.name} yet. Try another category, or check back soon.`
                      : "We're onboarding our first sellers right now. Check back soon — or sign up as a provider to list yours."
                  }
                  title="No live listings yet"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA: Run your business */}
      <section className="page-shell py-12">
        <div className="panel flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-h1 text-ink">
              Run your business with {APP_NAME}.
            </h2>
            <p className="mt-2 text-body text-black/60">
              Reach buyers, ship through approved drivers, and get paid.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="btn-primary px-6"
              data-testid="home-final-sell-link"
              href="/auth/register"
            >
              Sell on {APP_NAME}
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
            </Link>
            <Link
              className="btn-secondary px-6"
              data-testid="home-final-drive-link"
              href="/auth/register"
            >
              Drive for {APP_NAME}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
