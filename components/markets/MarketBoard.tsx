"use client"

import MarketListItem from "@/components/markets/MarketListItem"
import { useMarkets } from "@/components/providers/MarketProvider"
import { MarketCardSkeleton } from "@/components/ui/Skeleton"
import { CATEGORY_LABELS } from "@/lib/markets/categories"
import { MARKET_CATEGORIES } from "@/lib/markets/types"

const GRID_CLASS = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

export default function MarketBoard() {
  const {
    boardMarkets,
    sort,
    isLoading,
    selectMarket,
    setCategory,
    setStatus,
    setSearch,
  } = useMarkets()

  if (isLoading) {
    return (
      <div className={GRID_CLASS}>
        {Array.from({ length: 8 }).map((_, index) => (
          <MarketCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    )
  }

  if (boardMarkets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 px-5 py-14 text-center">
        <p className="text-sm font-semibold">No markets match your filters</p>
        <p className="mt-1 text-xs text-neutral-500">
          Try a different category, status, or search phrase.
        </p>
        <button
          type="button"
          onClick={() => {
            setCategory("all")
            setStatus("all")
            setSearch("")
          }}
          className="mt-4 rounded-full border border-ink px-3 py-1.5 text-[11px] font-bold transition hover:bg-ink hover:text-white"
        >
          Clear filters
        </button>
      </div>
    )
  }

  if (sort === "category") {
    const groups = MARKET_CATEGORIES.map((category) => ({
      category,
      markets: boardMarkets.filter((market) => market.category === category),
    })).filter((group) => group.markets.length > 0)

    return (
      <div className="space-y-8">
        {groups.map((group) => (
          <section
            key={group.category}
            aria-label={CATEGORY_LABELS[group.category]}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
                {CATEGORY_LABELS[group.category]}
              </h3>
              <span className="text-[10px] font-semibold text-neutral-400">
                {group.markets.length}
              </span>
            </div>
            <div className={`mt-3 ${GRID_CLASS}`}>
              {group.markets.map((market) => (
                <MarketListItem
                  compact
                  key={market.id}
                  market={market}
                  onSelect={selectMarket}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className={GRID_CLASS}>
      {boardMarkets.map((market) => (
        <MarketListItem
          compact
          key={market.id}
          market={market}
          onSelect={selectMarket}
        />
      ))}
    </div>
  )
}
