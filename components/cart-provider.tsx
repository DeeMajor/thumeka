"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import type { CartItem } from "@/lib/cart-types";

const STORAGE_KEY = "thumeka.cart.v1";

type AddResult = "added" | "already" | "skipped";

type CartContextValue = {
  items: CartItem[];
  /** Provider/business of the cart's current items, if any. */
  providerId: string | null;
  businessName: string | null;
  count: number;
  total: number;
  /** Has the localStorage hydration finished? Use to avoid SSR/CSR flash. */
  ready: boolean;
  isInCart: (listingId: string) => boolean;
  /**
   * Add an item to the cart.
   *
   *  - returns `"already"` if the listing is already in the cart
   *  - returns `"added"` if added successfully
   *  - returns `"skipped"` if the cart had items from a different seller
   *    and the user declined to clear it (via the `onConflict` callback)
   *
   * `onConflict` is async-friendly — pass an async function that resolves
   * to `true` to clear the cart and add the new item. If omitted the
   * conflict is always skipped.
   */
  addItem: (
    item: CartItem,
    options?: {
      onConflict?: (currentBusiness: string) => Promise<boolean> | boolean;
    }
  ) => Promise<AddResult>;
  removeItem: (listingId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CartItem =>
        entry !== null &&
        typeof entry === "object" &&
        typeof entry.listingId === "string" &&
        typeof entry.providerId === "string"
    );
  } catch {
    return [];
  }
}

function writeStoredCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota or storage disabled — swallow; cart state will just be
    // session-local until the next interaction.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Empty until hydration so SSR + CSR markup agree.
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeStoredCart(items);
  }, [items, ready]);

  // Keep multiple tabs in sync — a storage event fires in OTHER tabs
  // when localStorage changes. Without this, two browser tabs would drift.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setItems(readStoredCart());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const providerId = items[0]?.providerId ?? null;
  const businessName = items[0]?.businessName ?? null;
  const count = items.length;
  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price ?? 0), 0),
    [items]
  );

  const isInCart = useCallback(
    (listingId: string) => items.some((item) => item.listingId === listingId),
    [items]
  );

  const addItem = useCallback<CartContextValue["addItem"]>(
    async (item, options) => {
      if (items.some((existing) => existing.listingId === item.listingId)) {
        return "already";
      }

      if (providerId && providerId !== item.providerId) {
        const shouldReplace = options?.onConflict
          ? await options.onConflict(businessName ?? "another seller")
          : false;
        if (!shouldReplace) return "skipped";
        setItems([item]);
        return "added";
      }

      setItems((current) => [...current, item]);
      return "added";
    },
    [items, providerId, businessName]
  );

  const removeItem = useCallback((listingId: string) => {
    setItems((current) =>
      current.filter((item) => item.listingId !== listingId)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      providerId,
      businessName,
      count,
      total,
      ready,
      isInCart,
      addItem,
      removeItem,
      clear
    }),
    [items, providerId, businessName, count, total, ready, isInCart, addItem, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>.");
  }
  return context;
}
