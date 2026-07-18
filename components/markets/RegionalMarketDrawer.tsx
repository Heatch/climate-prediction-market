"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import MarketDetails from "@/components/markets/MarketDetails"
import MarketFilters from "@/components/markets/MarketFilters"
import MarketListItem from "@/components/markets/MarketListItem"
import { useMarkets } from "@/components/providers/MarketProvider"
import type { MarketCategory } from "@/lib/markets/types"

export default function RegionalMarketDrawer() {
  const {
    markets,
    selectedRegion,
    selectedMarket,
    isDrawerOpen,
    selectMarket,
    showRegionMarkets,
    closeDrawer,
  } = useMarkets()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<MarketCategory | "all">("all")
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isDrawerOpen) return
    closeButtonRef.current?.focus({ preventScroll: true })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeDrawer, isDrawerOpen])

  useEffect(() => {
    setSearch("")
    setCategory("all")
  }, [selectedRegion])

  const regionMarkets = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    return markets.filter(
      (market) =>
        market.continent === selectedRegion &&
        (category === "all" || market.category === category) &&
        (!normalizedSearch ||
          `${market.question} ${market.region} ${market.category}`
            .toLocaleLowerCase()
            .includes(normalizedSearch)),
    )
  }, [category, markets, search, selectedRegion])

  if (!isDrawerOpen || !selectedRegion) return null

  const activeCount = markets.filter(
    (market) => market.continent === selectedRegion && market.status === "open",
  ).length

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-black/20 backdrop-blur-[2px] md:hidden"
        aria-label="Close market panel"
        onClick={closeDrawer}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={
          selectedMarket
            ? `Market details: ${selectedMarket.question}`
            : `${selectedRegion} markets`
        }
        data-testid="market-drawer"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-hidden rounded-t-[1.75rem] border border-neutral-300 bg-paper shadow-panel md:inset-y-[92px] md:left-auto md:right-5 md:max-h-none md:w-[min(570px,calc(100vw-3rem))] md:rounded-[1.5rem] lg:right-7"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="hidden size-2 rounded-full bg-ink sm:block"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  {selectedMarket ? selectedMarket.region : selectedRegion}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  {activeCount} active demo market{activeCount === 1 ? "" : "s"}{" "}
                  · Devnet
                </p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeDrawer}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-neutral-300 bg-white text-lg transition hover:border-ink hover:bg-ink hover:text-white"
              aria-label="Close market panel"
            >
              ×
            </button>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {selectedMarket ? (
              <MarketDetails
                market={selectedMarket}
                onBack={showRegionMarkets}
              />
            ) : (
              <div>
                <p className="eyebrow">Regional desk</p>
                <div className="mt-1 flex items-end justify-between gap-4">
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                    {selectedRegion}
                  </h2>
                  <span className="text-[10px] font-semibold text-neutral-500">
                    {regionMarkets.length} shown
                  </span>
                </div>
                <p className="mt-2 max-w-md text-xs leading-5 text-neutral-500">
                  Browse fictional climate-risk markets mapped to this region.
                  Pool and chart values are sample data.
                </p>

                <label className="mt-5 block" htmlFor="region-market-search">
                  <span className="sr-only">
                    Search within {selectedRegion}
                  </span>
                  <input
                    id="region-market-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${selectedRegion}`}
                    className="h-10 w-full rounded-full border border-neutral-300 bg-white px-4 text-xs outline-none transition focus:border-ink focus:ring-1 focus:ring-ink"
                  />
                </label>
                <div className="mt-3">
                  <MarketFilters
                    compact
                    value={category}
                    onChange={setCategory}
                  />
                </div>

                <div
                  className="mt-5 space-y-3"
                  data-testid="regional-market-list"
                >
                  {regionMarkets.map((market) => (
                    <MarketListItem
                      key={market.id}
                      market={market}
                      onSelect={selectMarket}
                    />
                  ))}
                  {regionMarkets.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-neutral-300 px-5 py-12 text-center">
                      <p className="text-sm font-semibold">
                        No matching markets
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Try a different risk category or search phrase.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("")
                          setCategory("all")
                        }}
                        className="mt-4 rounded-full border border-ink px-3 py-1.5 text-[11px] font-bold hover:bg-ink hover:text-white"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
