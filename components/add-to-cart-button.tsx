"use client";

import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { useCart } from "@/components/cart-provider";
import type { CartItem } from "@/lib/cart-types";

type AddToCartButtonProps = {
  item: CartItem;
  /**
   * Visual variant:
   *  - "fab": small round "+" floating action button — used as an image
   *           corner overlay on listing cards.
   *  - "label": full-width "Add to cart" button — used on the listing
   *           detail page beside the existing Checkout CTA.
   */
  variant?: "fab" | "label";
  className?: string;
  "data-testid"?: string;
};

/**
 * Reusable add-to-cart / remove-from-cart trigger. Behaves as a toggle: the
 * same button adds when the listing is absent from the cart and removes when
 * it's already there. The single-seller conflict logic from the cart provider
 * still applies on the add path — if the cart already holds items from
 * another seller, the user gets a confirm() dialog.
 *
 * Inside a `<Link>` listing card the fab variant calls preventDefault +
 * stopPropagation so tapping the button doesn't also fire the card's
 * navigation.
 */
export function AddToCartButton({
  item,
  variant = "fab",
  className,
  "data-testid": testId
}: AddToCartButtonProps) {
  const { addItem, removeItem, isInCart, ready } = useCart();
  const [flashAdded, setFlashAdded] = useState(false);

  const inCart = ready && isInCart(item.listingId);

  async function handleClick(event: React.MouseEvent) {
    // Stop the parent <Link> (if any) from navigating when the button
    // is rendered as an image overlay on a listing card.
    event.preventDefault();
    event.stopPropagation();

    if (inCart) {
      removeItem(item.listingId);
      return;
    }

    const result = await addItem(item, {
      onConflict: (currentBusiness) =>
        window.confirm(
          `Your cart has items from ${currentBusiness}. Replace with this item from ${item.businessName ?? "this seller"}?`
        )
    });

    if (result === "added") {
      setFlashAdded(true);
      setTimeout(() => setFlashAdded(false), 1500);
    }
  }

  if (variant === "fab") {
    // Three states: just-added flash (green check), in-cart (green minus,
    // clickable to remove), idle (coral plus).
    const cls = flashAdded
      ? STYLE_FAB_DONE
      : inCart
        ? STYLE_FAB_IN_CART
        : STYLE_FAB_IDLE;
    const Icon = flashAdded ? Check : inCart ? Minus : Plus;
    const ariaLabel = flashAdded
      ? "Added to cart"
      : inCart
        ? "Remove from cart"
        : "Add to cart";
    return (
      <button
        aria-label={ariaLabel}
        className={`${cls} ${className ?? ""}`}
        data-testid={testId ?? "add-to-cart-fab"}
        onClick={handleClick}
        type="button"
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </button>
    );
  }

  // "label" variant
  const labelCls = flashAdded
    ? STYLE_LABEL_DONE
    : inCart
      ? STYLE_LABEL_IN_CART
      : STYLE_LABEL_IDLE;
  return (
    <button
      className={`${labelCls} ${className ?? ""}`}
      data-testid={testId ?? "add-to-cart-label"}
      onClick={handleClick}
      type="button"
    >
      {flashAdded ? (
        <>
          <Check aria-hidden="true" className="h-4 w-4" />
          Added
        </>
      ) : inCart ? (
        <>
          <Minus aria-hidden="true" className="h-4 w-4" />
          Remove from cart
        </>
      ) : (
        <>
          <ShoppingCart aria-hidden="true" className="h-4 w-4" />
          Add to cart
        </>
      )}
    </button>
  );
}

const STYLE_FAB_IDLE =
  "inline-flex h-9 w-9 items-center justify-center rounded-full bg-coral text-white shadow-soft transition hover:bg-coral/90 active:scale-95";
const STYLE_FAB_DONE =
  "inline-flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-white shadow-soft transition";
const STYLE_FAB_IN_CART =
  "inline-flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-white shadow-soft transition hover:bg-leaf/90 active:scale-95";

const STYLE_LABEL_IDLE =
  "btn-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto";
const STYLE_LABEL_DONE =
  "inline-flex items-center justify-center gap-2 rounded-md border border-leaf bg-mint px-4 py-2 text-sm font-semibold text-leaf transition w-full sm:w-auto";
const STYLE_LABEL_IN_CART =
  "inline-flex items-center justify-center gap-2 rounded-md border border-leaf bg-mint px-4 py-2 text-sm font-semibold text-leaf transition hover:bg-mint/70 active:scale-[0.98] w-full sm:w-auto";
