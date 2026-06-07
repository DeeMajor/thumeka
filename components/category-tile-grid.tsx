"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  CATEGORY_TINT_CLASSES,
  getCategoryVisual
} from "@/lib/category-visuals";
import {
  parseCategoryList,
  serialiseCategoryList
} from "@/lib/marketplace-filters";

type CategoryTileGridProps = {
  categories: string[];
  /** Multi-select — zero or more active category names. */
  activeCategories: string[];
  /** Mobile-only by default; pass true to render the desktop layout
   *  too. Homepage mounts it twice (mobile band + a denser desktop
   *  band) since the two layouts are quite different. */
  layout: "mobile" | "desktop";
  className?: string;
};

/**
 * Icon-tile grid for category discovery.
 *
 *   - Mobile: 3 columns × N rows, big tiles, prominent placement above
 *     search results.
 *   - Desktop: 6 columns × N rows, denser, sits above the listings grid
 *     as a secondary discovery surface beside the existing sidebar.
 *
 * Tapping a tile toggles it in the URL's comma-separated `?category=`
 * list — buyers can pick more than one category at a time. Other URL
 * params (search keyword, sort, price band) are preserved.
 */
export function CategoryTileGrid({
  categories,
  activeCategories,
  layout,
  className
}: CategoryTileGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function urlFor(nextSelection: string[]): string {
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== "category") params.set(key, value);
    });
    const serialised = serialiseCategoryList(nextSelection);
    if (serialised) params.set("category", serialised);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function onTap(category: string) {
    // Re-read the URL so we don't lose selections made between renders
    // (the prop is stale once a parallel tap is in flight).
    const current = parseCategoryList(searchParams.get("category") ?? "");
    const lower = category.toLowerCase();
    const isActive = current.some((name) => name.toLowerCase() === lower);
    const next = isActive
      ? current.filter((name) => name.toLowerCase() !== lower)
      : [...current, category];
    startTransition(() => {
      router.replace(urlFor(next), { scroll: false });
    });
  }

  const gridCls =
    layout === "mobile"
      ? "grid grid-cols-3 gap-2 sm:hidden"
      : "hidden grid-cols-6 gap-3 sm:grid";

  return (
    <div
      aria-busy={isPending}
      aria-label="Categories"
      className={`${gridCls} ${className ?? ""}`}
      data-testid={`category-tile-grid-${layout}`}
    >
      {categories.map((category) => {
        const isActive = activeCategories.some(
          (name) => name.toLowerCase() === category.toLowerCase()
        );
        const visual = getCategoryVisual(category);
        const tint = CATEGORY_TINT_CLASSES[visual.tint];
        const Icon = visual.icon;
        return (
          <button
            aria-pressed={isActive}
            className={`group flex flex-col items-center justify-center gap-1.5 rounded-2xl border bg-white p-3 text-center shadow-soft transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-leaf focus:ring-offset-1 ${
              isActive
                ? "border-leaf bg-mint"
                : "border-black/10 hover:border-leaf/40"
            }`}
            data-testid="category-tile"
            key={category}
            onClick={() => onTap(category)}
            type="button"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full ${tint.bg} ${tint.fg} transition group-hover:scale-105 sm:h-12 sm:w-12`}
            >
              <Icon
                aria-hidden="true"
                className="h-5 w-5 sm:h-6 sm:w-6"
              />
            </span>
            <span className="text-caption font-semibold leading-tight text-ink sm:text-xs">
              {category}
            </span>
          </button>
        );
      })}
    </div>
  );
}
