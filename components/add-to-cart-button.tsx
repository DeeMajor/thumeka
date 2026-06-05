"use client";

import { Check, Plus, ShoppingCart } from "lucide-react";
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
 * Reusable "add to cart" trigger. Both variants share the same single-seller
 * conflict logic from the cart provider: if the cart already holds items
 * from another seller, the user gets a confirm() dialog and can choose to
 * clear and add. If they decline, the cart stays as-is.
 *
 * Inside a `<Link>` listing card the fab variant calls preventDefault +
 * stopPropagation so tapping the plus button doesn't also fire the card's
 * navigation.
 */
export function AddToCartButton({
  item,
  variant = "fab",
  className,
  "data-testid": testId
}: AddToCartButtonProps) {
  const { addItem, isInCart, ready } = useCart();
  const [flashAdded, setFlashAdded] = useState(false);

  const inCart = ready && isInCart(item.listingId);

  async function handleClick(event: React.MouseEvent) {
    // Stop the parent <Link> (if any) from navigating when the button
    // is rendered as an image overlay on a listing card.
    event.preventDefault();
    event.stopPropagation();

    if (inCart) return;

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
    const cls = inCart || flashAdded ? STYLE_FAB_DONE : STYLE_FAB_IDLE;
    const Icon = inCart || flashAdded ? Check : Plus;
    return (
      <button
        aria-label={inCart ? "Already in cart" : "Add to cart"}
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
  const cls = inCart || flashAdded ? STYLE_LABEL_DONE : STYLE_LABEL_IDLE;
  return (
    <button
      className={`${cls} ${className ?? ""}`}
      data-testid={testId ?? "add-to-cart-label"}
      onClick={handleClick}
      type="button"
    >
      {inCart ? (
        <>
          <Check aria-hidden="true" className="h-4 w-4" />
          In cart
        </>
      ) : flashAdded ? (
        <>
          <Check aria-hidden="true" className="h-4 w-4" />
          Added
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

const STYLE_LABEL_IDLE =
  "btn-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto";
const STYLE_LABEL_DONE =
  "inline-flex items-center justify-center gap-2 rounded-md border border-leaf bg-mint px-4 py-2 text-sm font-semibold text-leaf transition w-full sm:w-auto";
