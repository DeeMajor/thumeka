"use client";

import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";
import { useState } from "react";

import { CategoryTileGrid } from "@/components/category-tile-grid";

type CollapsibleCategoryBandProps = {
  categories: string[];
  activeCategory: string | undefined;
  layout: "mobile" | "desktop";
  /** Optional id so the button + region get matching aria controls. */
  id?: string;
};

/**
 * Wraps the existing `<CategoryTileGrid>` in a collapse/expand toggle.
 *
 * Default state is **collapsed** so the search-results grid sits right
 * under the navbar — the band only shows after the buyer asks for it.
 * State lives in local React state (ephemeral); we can persist to
 * localStorage later if it matters.
 */
export function CollapsibleCategoryBand({
  categories,
  activeCategory,
  layout,
  id
}: CollapsibleCategoryBandProps) {
  // If a category is already selected via URL, expand by default so the
  // chosen tile is visible. Otherwise stay collapsed.
  const [expanded, setExpanded] = useState(() => Boolean(activeCategory));
  const regionId = id ?? `categories-${layout}`;

  const wrapperCls =
    layout === "mobile" ? "sm:hidden" : "hidden sm:block";

  return (
    <div
      className={wrapperCls}
      data-testid={`collapsible-category-band-${layout}`}
    >
      <button
        aria-controls={regionId}
        aria-expanded={expanded}
        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-body-sm font-semibold text-ink shadow-soft transition hover:border-leaf/40 hover:text-leaf"
        data-testid={`collapsible-category-band-${layout}-toggle`}
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <LayoutGrid aria-hidden="true" className="h-4 w-4" />
        {expanded ? "Hide categories" : "Show categories"}
        {expanded ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
      {expanded ? (
        <div className="mt-3" id={regionId}>
          <CategoryTileGrid
            activeCategory={activeCategory}
            categories={categories}
            layout={layout}
          />
        </div>
      ) : null}
    </div>
  );
}
