import Link from "next/link";
import { MapPin, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ListingImage } from "@/components/listing-image";
import { getCurrentProfile } from "@/lib/auth";
import { SEEDED_CATEGORIES } from "@/lib/constants";
import type { CategoryRow, ListingRow } from "@/lib/database.types";
import { formatMoney, titleCase } from "@/lib/format";
import { roleHomePath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getMarketplaceData() {
  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: listings }, { data: categories }] = await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .eq("is_active", true)
        .eq("admin_disabled", false)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    ]);

    return {
      listings: (listings ?? []) as ListingRow[],
      categories: (categories ?? []) as CategoryRow[],
      configured: true
    };
  } catch {
    return {
      listings: [] as ListingRow[],
      categories: [] as CategoryRow[],
      configured: false
    };
  }
}

export default async function ListingsPage() {
  const [{ listings, categories, configured }, profile] = await Promise.all([
    getMarketplaceData(),
    getCurrentProfile().catch(() => null),
  ]);
  const categoryNames = categories.length
    ? categories.map((category) => category.name)
    : SEEDED_CATEGORIES;
  const categoriesById = new Map(
    categories.map((category) => [category.id, category])
  );

  return (
    <div className="bg-mist" data-testid="page-listings">
      <section className="section-band">
        <div className="page-shell gap-5 py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-h1 text-ink" data-testid="listings-heading">
                Browse the marketplace
              </h1>
              <p className="mt-1 text-body-sm text-black/55">
                {listings.length} approved {listings.length === 1 ? "listing" : "listings"} across Durban &middot; priced in ZAR
              </p>
            </div>
            {profile ? (
              <Link className="btn-primary" data-testid="listings-dashboard-link" href={roleHomePath(profile.role)}>
                My dashboard
              </Link>
            ) : (
              <Link className="btn-primary" data-testid="listings-create-account-link" href="/auth/register">
                Create account
              </Link>
            )}
          </div>

          <form className="flex gap-2 rounded-lg border border-black/10 bg-white p-2" data-testid="listings-search-form">
            <label className="flex min-w-0 flex-1 items-center gap-2 px-2">
              <Search className="h-4 w-4 flex-none text-black/45" aria-hidden="true" />
              <span className="sr-only">Search listings</span>
              <input
                className="min-h-10 w-full bg-transparent text-sm outline-none"
                data-testid="listings-search-input"
                name="q"
                placeholder="Search food, repairs, errands"
              />
            </label>
            <button className="btn-secondary px-3" data-testid="listings-search-button" type="submit">
              Search
            </button>
          </form>

          <div
            aria-label="Categories"
            className="flex gap-2 overflow-x-auto pb-1 focus:outline-none focus:ring-2 focus:ring-leaf/40"
            data-testid="category-filter-list"
            tabIndex={0}
          >
            {categoryNames.map((category) => (
              <span
                className="whitespace-nowrap rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/70"
                key={category}
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-6">
        {!configured ? (
          <div className="mb-4 rounded-md border border-maize/60 bg-maize/20 p-3 text-sm text-ink">
            Live listings are temporarily unavailable. Please check back shortly.
          </div>
        ) : null}

        {listings.length ? (
          <div className="mobile-grid">
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
                <h2 className="line-clamp-2 text-base font-semibold">
                  {listing.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/60">
                  {listing.description}
                </p>
                <p className="mt-3 flex items-center gap-1 text-xs font-medium text-black/55">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {listing.suburb ?? "Durban"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            body="We're onboarding our first Durban sellers right now. Check back soon — or sign up as a provider to list yours."
            title="No live listings yet"
          />
        )}
      </section>
    </div>
  );
}
