"use server";

import { redirect } from "next/navigation";

import { OrderRequestedEmail } from "@/emails/order-requested";
import { requireRole } from "@/lib/auth";
import { getDeliveryQuote } from "@/lib/delivery";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateAndNormalizeZaPhone } from "@/lib/validators";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readFiniteNumber(formData: FormData, key: string) {
  const raw = readString(formData, key);
  if (!raw) {
    return null;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createOrderRequestAction(formData: FormData) {
  const { profile } = await requireRole(["buyer"]);
  const listingId = readString(formData, "listing_id");

  if (!listingId) {
    redirect("/listings");
  }

  const buyerName = readString(formData, "buyer_name") || profile.full_name || "";
  const buyerPhone = readString(formData, "buyer_phone") || profile.phone || "";
  const buyerEmail = readString(formData, "buyer_email") || profile.email;
  const deliveryAddress = readString(formData, "delivery_address");
  const suburb = readString(formData, "suburb");
  const buyerNotes = readString(formData, "buyer_notes");
  const requestedDate = readString(formData, "requested_date") || null;
  const requestedTime = readString(formData, "requested_time") || null;

  if (!buyerName || !buyerPhone || !buyerEmail) {
    redirect(`/checkout/${listingId}?error=Name%2C%20phone%20and%20email%20are%20required`);
  }

  // Normalise the buyer phone before persistence so the provider always sees
  // a callable 0XXXXXXXXX number, no matter what the buyer typed.
  const phoneResult = validateAndNormalizeZaPhone(buyerPhone);
  if (!phoneResult.ok) {
    redirect(
      `/checkout/${listingId}?error=${encodeURIComponent(phoneResult.error)}`
    );
  }
  const normalizedBuyerPhone = phoneResult.value;

  const supabase = await createSupabaseServerClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, provider_id, listing_type, price, title")
    .eq("id", listingId)
    .eq("is_active", true)
    .eq("admin_disabled", false)
    .maybeSingle();

  if (!listing) {
    redirect("/listings?error=Listing%20is%20not%20available");
  }

  // Price the order authoritatively from the address — never trust a
  // client-supplied fee. Block if a delivery fee can't be determined.
  const clientLat = readFiniteNumber(formData, "delivery_lat");
  const clientLng = readFiniteNumber(formData, "delivery_lng");
  const dest =
    clientLat !== null && clientLng !== null
      ? { lat: clientLat, lng: clientLng }
      : null;

  const quote = await getDeliveryQuote({
    listingId: listing.id,
    address: deliveryAddress,
    suburb,
    dest
  });

  if (!quote) {
    redirect(
      `/checkout/${listingId}?error=${encodeURIComponent(
        "We couldn't calculate a delivery fee for that address. Check it and try again."
      )}`
    );
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      buyer_id: profile.id,
      provider_id: listing.provider_id,
      listing_id: listing.id,
      order_type: listing.listing_type,
      status: "order_requested",
      buyer_name: buyerName,
      buyer_phone: normalizedBuyerPhone,
      buyer_email: buyerEmail,
      delivery_address: deliveryAddress || null,
      delivery_lat: quote.deliveryLat,
      delivery_lng: quote.deliveryLng,
      suburb: suburb || null,
      buyer_notes: buyerNotes || null,
      requested_date: requestedDate,
      requested_time: requestedTime,
      listing_price: quote.listingPrice,
      delivery_distance_km: quote.distanceKm,
      delivery_base_fee: quote.baseFee,
      delivery_price_per_km: quote.pricePerKm,
      delivery_fee: quote.deliveryFee,
      buyer_total: quote.buyerTotal,
      commission_percentage: quote.commissionPercentage,
      commission_amount: quote.commissionAmount,
      delivery_commission_amount: quote.deliveryCommissionAmount,
      provider_earning: quote.providerEarning,
      driver_earning: quote.driverEarning,
      payment_status: "not_requested"
    })
    .select("id")
    .single();

  if (error || !order) {
    redirect(`/checkout/${listingId}?error=Unable%20to%20create%20order%20request`);
  }

  await supabase.from("order_status_events").insert({
    order_id: order.id,
    new_status: "order_requested",
    changed_by: profile.id,
    note: "Buyer submitted order request"
  });

  // Notify provider of new order request
  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("user_id, business_name")
    .eq("id", listing.provider_id)
    .maybeSingle();

  if (providerProfile) {
    const { data: providerUserProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", providerProfile.user_id)
      .maybeSingle();

    if (providerUserProfile) {
      sendEmail({
        to: providerUserProfile.email,
        subject: "New order request — Thumeka",
        react: OrderRequestedEmail({
          providerName:
            providerProfile.business_name ??
            providerUserProfile.full_name ??
            providerUserProfile.email,
          buyerName: buyerName,
          buyerPhone: normalizedBuyerPhone,
          buyerEmail: buyerEmail,
          listingTitle: (listing as { title?: string }).title ?? listing.id,
          listingPrice: quote.listingPrice,
          deliveryAddress: deliveryAddress || null,
          suburb: suburb || null,
          buyerNotes: buyerNotes || null,
          requestedDate: requestedDate,
          requestedTime: requestedTime,
          orderId: order.id,
          appUrl: getAppUrl(),
          dashboardUrl: `${getAppUrl()}/provider/dashboard`,
        }),
      }).catch((err: Error) => console.warn("[email] Order request email failed:", err.message));
    }
  }

  redirect(`/buyer/orders?created=${order.id}`);
}
