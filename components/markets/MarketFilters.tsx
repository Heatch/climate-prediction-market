"use client"

import type { MarketCategory } from "@/lib/markets/types"

const FILTERS: Array<{ value: MarketCategory | "all"; label: string }> = [
  { value: "all", label: "All risks" },
  { value: "hurricane", label: "Hurricanes" },
  { value: "drought", label: "Drought" },
  { value: "temperature", label: "Temperature" },
  { value: "rainfall", label: "Rainfall" },
  { value: "flooding", label: "Flooding" },
  { value: "crop-yield", label: "Crops" },
  { value: "wildfire", label: "Wildfire" },
]

interface MarketFiltersProps {
  value: MarketCategory | "all"
  onChange: (value: MarketCategory | "all") => void
  compact?: boolean
  tone?: "light" | "dark"
}

export default function MarketFilters({
  value,
  onChange,
  compact = false,
  tone = "light",
}: MarketFiltersProps) {
  return (
    <div
      className="scrollbar-none flex gap-2 overflow-x-auto py-1"
      role="group"
      aria-label="Filter climate markets by category"
    >
      {FILTERS.map((filter) => {
        const selected = filter.value === value
        const selectedClass =
          tone === "dark"
            ? "border-white bg-white text-ink"
            : "border-ink bg-ink text-white"
        const unselectedClass =
          tone === "dark"
            ? "border-white/25 bg-white/10 text-neutral-200 hover:border-white/60 hover:text-white"
            : "border-neutral-300 bg-white/70 text-neutral-600 hover:border-neutral-500 hover:text-ink"
        return (
          <button
            type="button"
            key={filter.value}
            aria-pressed={selected}
            onClick={() => onChange(filter.value)}
            className={`shrink-0 rounded-full border font-semibold transition ${
              compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"
            } ${selected ? selectedClass : unselectedClass}`}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
