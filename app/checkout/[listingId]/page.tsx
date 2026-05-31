import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { CheckoutForm } from "@/app/checkout/[listingId]/checkout-form";
import { requireRole } from "@/lib/auth";
import type { ListingRow } from "@/lib/database.types";
import { formatMoney } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckoutPageProps = {
  params: Promise<{
    listingId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

async function getListing(listingId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("is_active", true)
    .eq("admin_disabled", false)
    .maybeSingle();

  return data as ListingRow | null;
}

export default async function CheckoutPage({
  params,
  searchParams
}: CheckoutPageProps) {
  const { listingId } = await params;
  const query = await searchParams;
  const [{ profile }, listing] = await Promise.all([
    requireRole(["buyer"]),
    getListing(listingId)
  ]);

  if (!listing) {
    return (
      <div className="page-shell max-w-xl py-8">
        <Link className="mb-4 inline-flex items-center text-sm font-semibold text-leaf" href="/listings">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Listings
        </Link>
        <div className="panel">This listing is no longer available.</div>
      </div>
    );
  }

  return (
    <div className="section-band" data-testid="page-checkout">
      <div className="page-shell max-w-2xl py-6">
        <Link className="mb-4 inline-flex items-center text-sm font-semibold text-leaf" href={`/listings/${listing.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Listing
        </Link>
        <div className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-mint text-leaf">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-display-md text-ink">Request order</h1>
          <p className="mt-2 text-sm leading-6 text-black/60">
            EFT instructions are only shown after the provider accepts your order request.
          </p>
        </div>

        {query.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {query.error}
          </div>
        ) : null}

        <div className="mb-4 rounded-lg border border-black/10 bg-white p-4">
          <h2 className="font-semibold">{listing.title}</h2>
          <p className="mt-1 text-sm text-black/60">{formatMoney(listing.price)}</p>
        </div>

        <CheckoutForm
          defaultEmail={profile.email}
          defaultName={profile.full_name ?? ""}
          defaultPhone={profile.phone ?? ""}
          listingId={listing.id}
          listingPrice={listing.price}
        />
      </div>
    </div>
  );
}
