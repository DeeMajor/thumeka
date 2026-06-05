import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Store } from "lucide-react";

import { ListingImage } from "@/components/listing-image";
import type { CategoryRow, ListingRow } from "@/lib/database.types";
import { formatMoney, titleCase } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ListingPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getListing(id: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .eq("admin_disabled", false)
      .maybeSingle();

    if (!listing) {
      return null;
    }

    const { data: category } = await supabase
      .from("categories")
      .select("*")
      .eq("id", listing.category_id)
      .maybeSingle();

    return {
      listing: listing as ListingRow,
      category: category as Pick<CategoryRow, "name" | "slug"> | null
    };
  } catch {
    return null;
  }
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const data = await getListing(id);

  if (!data) {
    notFound();
  }

  const { listing, category } = data;

  return (
    <div className="section-band" data-testid="page-listing-detail">
      <div className="page-shell max-w-3xl py-6">
        <Link className="mb-4 inline-flex items-center text-sm font-semibold text-leaf" href="/listings">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Listings
        </Link>
        <div className="panel" data-testid="listing-detail-card">
          <ListingImage
            alt={listing.title}
            className="relative mb-5 aspect-[4/3] overflow-hidden rounded-md"
            storagePath={listing.image_url}
          />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-mint px-2 py-1 text-xs font-semibold text-leaf">
              {titleCase(listing.listing_type)}
            </span>
            {category ? (
              <span className="rounded-md bg-black/5 px-2 py-1 text-xs font-semibold text-black/60">
                {category.name}
              </span>
            ) : null}
          </div>
          <h1 className="text-display-md text-ink">{listing.title}</h1>
          {listing.business_name ? (
            <p
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-black/70"
              data-testid="listing-detail-seller"
            >
              <Store aria-hidden="true" className="h-4 w-4 text-black/45" />
              Sold by{" "}
              <span className="font-semibold text-ink">
                {listing.business_name}
              </span>
            </p>
          ) : null}
          <p className="mt-3 text-xl font-semibold text-leaf">
            {formatMoney(listing.price)}
          </p>
          <p className="mt-4 text-sm leading-6 text-black/65">{listing.description}</p>
          <p className="mt-4 flex items-center gap-1 text-sm font-medium text-black/55">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {listing.suburb ?? "—"}
          </p>
          {listing.availability_notes ? (
            <p className="mt-4 rounded-md bg-mist p-3 text-sm text-black/65">
              {listing.availability_notes}
            </p>
          ) : null}
          <Link
            className="btn-primary mt-6 w-full"
            data-testid="listing-request-order-link"
            href={`/checkout/${listing.id}`}
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
