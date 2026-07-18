"use client"

import MarketFilters from "@/components/markets/MarketFilters"
import {
  useMarkets,
  type MarketSort,
  type StatusFilter,
} from "@/components/providers/MarketProvider"
import { CATEGORY_LABELS } from "@/lib/markets/categories"

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "resolved", label: "Resolved" },
  { value: "cancelled", label: "Cancelled" },
]

const SORT_OPTIONS: Array<{ value: MarketSort; label: string }> = [
  { value: "trending", label: "Trending" },
  { value: "volume", label: "Volume" },
  { value: "closing", label: "Closing soon" },
  { value: "yes", label: "Highest YES" },
  { value: "category", label: "By category" },
]

function FilterChip({
  label,
  onClear,
}: {
  label: string
  onClear: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink py-1 pl-2.5 pr-1.5 text-[10px] font-bold text-white">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="grid size-4 place-items-center rounded-full text-white/70 transition hover:bg-white/20 hover:text-white"
      >
        ×
      </button>
    </span>
  )
}

export default function MarketControls() {
  const {
    markets,
    boardMarkets,
    category,
    setCategory,
    status,
    setStatus,
    sort,
    setSort,
    search,
    setSearch,
  } = useMarkets()

  const trimmedSearch = search.trim()
  const hasFilters =
    category !== "all" || status !== "all" || trimmedSearch !== ""

  return (
    <div className="sticky top-[128px] z-30 -mx-4 border-y border-neutral-200 bg-paper/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-[72px] lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white p-1 text-[11px] font-bold"
          role="group"
          aria-label="Filter markets by status"
        >
          {STATUS_TABS.map((tab) => {
            const selected = tab.value === status
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setStatus(tab.value)}
                className={`rounded-full px-3 py-1.5 transition ${
                  selected
                    ? "bg-ink text-white"
                    : "text-neutral-600 hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as MarketSort)}
            className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold normal-case tracking-normal text-ink outline-none transition hover:border-neutral-500 focus:border-ink focus:ring-1 focus:ring-ink"
            aria-label="Sort markets"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <MarketFilters compact value={category} onChange={setCategory} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p
          className="text-[11px] font-semibold text-neutral-500"
          aria-live="polite"
        >
          Showing {boardMarkets.length} of {markets.length} markets
        </p>
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            {category !== "all" && (
              <FilterChip
                label={CATEGORY_LABELS[category]}
                onClear={() => setCategory("all")}
              />
            )}
            {status !== "all" && (
              <FilterChip
                label={
                  STATUS_TABS.find((tab) => tab.value === status)?.label ??
                  status
                }
                onClear={() => setStatus("all")}
              />
            )}
            {trimmedSearch !== "" && (
              <FilterChip
                label={`\u201C${trimmedSearch}\u201D`}
                onClear={() => setSearch("")}
              />
            )}
            <button
              type="button"
              onClick={() => {
                setCategory("all")
                setStatus("all")
                setSearch("")
              }}
              className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 underline underline-offset-2 transition hover:text-ink"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
