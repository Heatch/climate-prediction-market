"use client"

import { MiniMarketChart } from "@/components/markets/MarketChart"
import type { ClimateMarket, MarketCategory } from "@/lib/markets/types"
import {
  formatCompact,
  formatCountdown,
  formatProbability,
} from "@/lib/utils/format"

const CATEGORY_SYMBOLS: Record<MarketCategory, string> = {
  hurricane: "◎",
  drought: "◌",
  temperature: "↑",
  rainfall: "≋",
  "crop-yield": "⌁",
  wildfire: "△",
  flooding: "≈",
  other: "◇",
}

interface MarketListItemProps {
  market: ClimateMarket
  onSelect: (market: ClimateMarket) => void
  compact?: boolean
}

export default function MarketListItem({
  market,
  onSelect,
  compact = false,
}: MarketListItemProps) {
  const yesProbability = formatProbability(market.yesPrice)
  const noProbability = formatProbability(market.noPrice)

  return (
    <button
      type="button"
      onClick={() => onSelect(market)}
      className={`group w-full rounded-2xl border border-neutral-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-lg hover:shadow-black/5 ${
        compact ? "p-3.5" : "p-4"
      }`}
      aria-label={`Open market: ${market.question}. YES ${yesProbability}, NO ${noProbability}.`}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full border border-neutral-200 bg-neutral-50 text-lg font-medium"
          aria-hidden="true"
        >
          {CATEGORY_SYMBOLS[market.category]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow truncate">{market.region}</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-500">
              {market.status}
            </span>
          </div>
          <h3
            className={`mt-2 font-semibold leading-snug tracking-[-0.015em] ${compact ? "text-[13px]" : "text-sm"}`}
          >
            {market.question}
          </h3>
        </div>
        <span
          className="mt-1 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-ink"
          aria-hidden="true"
        >
          →
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3 border-t border-neutral-100 pt-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-ink px-2 py-1 text-[10px] font-bold text-white">
              YES {yesProbability}
            </span>
            <span className="rounded-md border border-neutral-300 px-2 py-1 text-[10px] font-bold text-neutral-600">
              NO {noProbability}
            </span>
          </div>
          <p className="mt-2 text-[10px] text-neutral-500">
            {formatCompact(market.totalVolume)} SOL volume ·{" "}
            {formatCountdown(market.closeTime)}
          </p>
        </div>
        <div className="text-ink">
          <MiniMarketChart history={market.history} />
        </div>
      </div>
    </button>
  )
}
