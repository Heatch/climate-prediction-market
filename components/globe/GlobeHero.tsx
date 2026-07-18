"use client"

import { useState } from "react"

import ClimateGlobe from "@/components/globe/ClimateGlobe"
import MarketFilters from "@/components/markets/MarketFilters"
import MarketListItem from "@/components/markets/MarketListItem"
import { useMarkets } from "@/components/providers/MarketProvider"

export default function GlobeHero() {
  const {
    visibleMarkets,
    selectedRegion,
    selectedMarket,
    category,
    setCategory,
    selectRegion,
    selectMarket,
  } = useMarkets()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const trendingMarkets = [...visibleMarkets]
    .filter((market) => market.status === "open")
    .sort((first, second) => second.trendingScore - first.trendingScore)
    .slice(0, 8)

  return (
    <section
      aria-label="Interactive climate globe"
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-[#101010]"
    >
      <ClimateGlobe
        fullBleed
        className="h-full"
        markets={visibleMarkets}
        selectedRegion={selectedRegion}
        selectedMarketId={selectedMarket?.id}
        onRegionSelect={selectRegion}
        onMarketSelect={selectMarket}
      />

      {/* Category filter overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center px-3 sm:top-20 sm:px-4">
        <div className="pointer-events-auto max-w-full overflow-hidden rounded-full border border-white/15 bg-black/40 px-2 py-1.5 shadow-panel backdrop-blur">
          <MarketFilters
            compact
            tone="dark"
            value={category}
            onChange={setCategory}
          />
        </div>
      </div>

      {/* Right-edge hover trigger zone */}
      <div
        aria-hidden="true"
        onMouseEnter={() => setIsSidebarOpen(true)}
        className="absolute right-0 top-0 z-30 h-full w-8"
      />

      {/* Discoverable handle (also toggles on touch / click) */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen((open) => !open)}
        aria-expanded={isSidebarOpen}
        aria-label="Show trending markets"
        className={`absolute right-0 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 rounded-l-xl border border-r-0 border-white/20 bg-black/60 px-2.5 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur transition hover:bg-black/80 ${
          isSidebarOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <span aria-hidden="true">‹</span>
        <span style={{ writingMode: "vertical-rl" }}>Trending</span>
      </button>

      {/* Sliding trending sidebar, revealed from the right edge */}
      <aside
        aria-label="Trending climate markets"
        onMouseEnter={() => setIsSidebarOpen(true)}
        onMouseLeave={() => setIsSidebarOpen(false)}
        className={`absolute right-0 top-0 z-30 flex h-full w-[min(380px,86vw)] flex-col border-l border-neutral-300 bg-paper shadow-panel transition-transform duration-300 ease-out ${
          isSidebarOpen
            ? "translate-x-0"
            : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="shrink-0 border-b border-neutral-200 bg-white/80 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Market signal</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                Trending climate risks
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="grid size-8 shrink-0 place-items-center rounded-full border border-neutral-300 bg-white text-base transition hover:border-ink hover:bg-ink hover:text-white"
              aria-label="Hide trending markets"
            >
              ›
            </button>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-neutral-500">
            Scroll to browse · select to inspect · fictional demo activity
          </p>
        </div>
        <div className="scrollbar-none min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {trendingMarkets.map((market) => (
            <MarketListItem
              compact
              key={market.id}
              market={market}
              onSelect={selectMarket}
            />
          ))}
          {trendingMarkets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-300 px-5 py-12 text-center text-sm text-neutral-500">
              No open markets to show.
            </div>
          )}
        </div>
      </aside>

      {/* Scroll cue toward the markets dashboard below */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
        <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
          Scroll for markets
          <span className="animate-bounce" aria-hidden="true">
            ↓
          </span>
        </span>
      </div>
    </section>
  )
}
