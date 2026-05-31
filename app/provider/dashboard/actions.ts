"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { OrderAcceptedEftEmail } from "@/emails/order-accepted-eft";
import { requireRole } from "@/lib/auth";
import type {
  OrderRow,
  ProviderProfileRow
} from "@/lib/database.types";
import type { ListingType } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { toLatLng } from "@/lib/geo";
import { isValidListingImageStoragePath } from "@/lib/listing-images";
import { geocodeAddress } from "@/lib/maps";
import {
  acceptProviderOrder,
  type OrderForRules
} from "@/lib/order-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveNumber(formData: FormData, key: string) {
  const parsed = Number.parseFloat(readString(formData, key));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function redirectWithError(message: string): never {
  redirect(`/provider/dashboard?error=${encodeURIComponent(message)}`);
}

function readListingType(formData: FormData): ListingType {
  const listingType = readString(formData, "listing_type");
  return ["product", "service", "errand"].includes(listingType)
    ? (listingType as ListingType)
    : "product";
}

async function getApprovedProviderProfile() {
  const { userId, profile } = await requireRole(["provider"]);
  const supabase = await createSupabaseServerClient();
  const { data: provider, error } = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (error || !provider) {
    redirectWithError("Provider profile was not found");
  }

  const providerProfile = provider as ProviderProfileRow;

  if (providerProfile.status !== "approved") {
    redirectWithError("Provider approval is required before using the dashboard");
  }

  return { userId, profile, supabase, providerProfile };
}

function buildOrderUpdate(order: OrderForRules) {
  return {
    status: order.status,
    payment_status: order.payment_status,
    accepted_at: order.accepted_at ?? null,
    delivery_distance_km: order.delivery_distance_km ?? null,
    delivery_base_fee: order.delivery_base_fee ?? 36,
    delivery_price_per_km: order.delivery_price_per_km ?? null,
    delivery_fee: order.delivery_fee ?? 0,
    buyer_total: order.buyer_total ?? order.listing_price,
    commission_percentage: order.commission_percentage ?? 12,
    commission_amount: order.commission_amount ?? 0,
    provider_earning: order.provider_earning ?? 0,
    driver_earning: order.driver_earning ?? 0
  };
}

export async function acceptProviderOrderAction(formData: FormData) {
  const orderId = readString(formData, "order_id");

  if (!orderId) {
    redirectWithError("Order is required");
  }

  const { profile, supabase, providerProfile } = await getApprovedProviderProfile();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("provider_id", providerProfile.id)
    .maybeSingle();

  if (orderError || !order) {
    redirectWithError("Order was not found");
  }

  const existingOrder = order as OrderRow & OrderForRules;

  if (!["order_requested", "awaiting_provider_acceptance"].includes(existingOrder.status)) {
    redirectWithError("Only new order requests can be accepted");
  }

  // Orders must arrive priced from checkout; defend against the legacy state.
  if (
    Number(existingOrder.delivery_fee ?? 0) <= 0 ||
    existingOrder.delivery_distance_km == null
  ) {
    redirectWithError(
      "This order has no delivery quote. The buyer needs to resubmit checkout."
    );
  }

  const acceptedOrder = acceptProviderOrder(existingOrder);

  // Atomic guard: restrict the update to orders still in the pre-acceptance
  // state. If the order was already accepted between the read and the write
  // (double-click, parallel admin/provider hit), the row is skipped and we
  // bail rather than recording two acceptance events.
  const { data: updatedRows, error: updateError } = await supabase
    .from("orders")
    .update(buildOrderUpdate(acceptedOrder))
    .eq("id", existingOrder.id)
    .eq("provider_id", providerProfile.id)
    .in("status", ["order_requested", "awaiting_provider_acceptance"])
    .select("id");

  if (updateError) {
    redirectWithError("Unable to accept this order");
  }

  if (!updatedRows || updatedRows.length === 0) {
    // Race lost — already accepted. Redirect to the success URL anyway since
    // the desired end state has been reached.
    redirect(`/provider/dashboard?accepted=${existingOrder.id}`);
  }

  await supabase.from("order_status_events").insert({
    order_id: existingOrder.id,
    old_status: existingOrder.status,
    new_status: acceptedOrder.status,
    changed_by: profile.id,
    note: "Provider accepted order"
  });

  // Send EFT instructions to buyer
  if (existingOrder.buyer_email && providerProfile.bank_account_number) {
    sendEmail({
      to: existingOrder.buyer_email,
      subject: "Your order has been accepted — EFT payment required — Thumeka",
      react: OrderAcceptedEftEmail({
        buyerName: existingOrder.buyer_name ?? existingOrder.buyer_email,
        listingTitle: existingOrder.listing_id,
        buyerTotal: Number(acceptedOrder.buyer_total),
        providerName: providerProfile.business_name ?? "Your provider",
        bankAccountName: providerProfile.bank_account_name ?? "",
        bankName: providerProfile.bank_name ?? "",
        bankAccountNumber: providerProfile.bank_account_number,
        bankBranchCode: providerProfile.bank_branch_code ?? "",
        orderId: existingOrder.id,
        appUrl: getAppUrl(),
        ordersUrl: `${getAppUrl()}/buyer/orders`,
      }),
    }).catch((err: Error) => console.warn("[email] Order accepted EFT email failed:", err.message));
  }

  revalidatePath("/provider/dashboard");
  revalidatePath("/buyer/orders");
  redirect(`/provider/dashboard?accepted=${existingOrder.id}`);
}

export async function createProviderListingAction(formData: FormData) {
  const { userId, supabase, providerProfile } = await getApprovedProviderProfile();
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const categoryId = readString(formData, "category_id");
  const price = readPositiveNumber(formData, "price");
  const imageStoragePath = readString(formData, "image_storage_path");

  if (!title || !description || !categoryId) {
    redirectWithError("Listing title, description, and category are required");
  }

  if (price === null) {
    redirectWithError("Listing price must be zero or more");
  }

  // Image is optional; validate only when provided so a forged path or a stray
  // external URL can't sneak into the listings table.
  if (
    imageStoragePath &&
    !isValidListingImageStoragePath({ path: imageStoragePath, userId })
  ) {
    redirectWithError("Couldn't recognise the uploaded image. Try uploading again.");
  }

  const suburb = readString(formData, "suburb") || providerProfile.suburb;
  const fulfillmentAddress =
    readString(formData, "fulfillment_address") || providerProfile.address;

  // Default the listing's coordinates from the provider's geocoded address; if
  // the address was amended, geocode the new one so distance stays accurate.
  let fulfillmentCoords = toLatLng(
    providerProfile.provider_lat,
    providerProfile.provider_lng
  );
  if (fulfillmentAddress && fulfillmentAddress !== providerProfile.address) {
    fulfillmentCoords = await geocodeAddress(
      `${fulfillmentAddress}, ${suburb ?? ""}, Durban, South Africa`
    );
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      provider_id: providerProfile.id,
      category_id: categoryId,
      title,
      description,
      listing_type: readListingType(formData),
      price,
      pricing_type: readString(formData, "pricing_type") || "fixed",
      suburb,
      fulfillment_address: fulfillmentAddress,
      fulfillment_lat: fulfillmentCoords?.lat ?? null,
      fulfillment_lng: fulfillmentCoords?.lng ?? null,
      image_url: imageStoragePath || null,
      is_active: true,
      admin_disabled: false
    })
    .select("id")
    .single();

  if (error || !listing) {
    redirectWithError("Unable to create listing");
  }

  revalidatePath("/provider/dashboard");
  revalidatePath("/listings");
  // Preserve the Listings tab on the redirect — without ?tab=listings the page
  // falls back to the Orders tab and the success banner appears without the
  // listings panel where the new card belongs.
  redirect(`/provider/dashboard?tab=listings&listing_created=${listing.id}`);
}
