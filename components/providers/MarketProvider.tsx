"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import { demoMarkets } from "@/lib/markets/data"
import type { ClimateMarket, MarketCategory } from "@/lib/markets/types"

type MarketContextValue = {
  markets: ClimateMarket[]
  visibleMarkets: ClimateMarket[]
  selectedRegion: string | null
  selectedMarket: ClimateMarket | null
  isDrawerOpen: boolean
  search: string
  category: MarketCategory | "all"
  setSearch: (value: string) => void
  setCategory: (value: MarketCategory | "all") => void
  selectRegion: (region: string) => void
  selectMarket: (market: ClimateMarket) => void
  showRegionMarkets: () => void
  closeDrawer: () => void
}

const MarketContext = createContext<MarketContextValue | null>(null)

function matchesSearch(market: ClimateMarket, search: string) {
  const normalized = search.trim().toLocaleLowerCase()
  if (!normalized) return true
  return [
    market.question,
    market.description,
    market.region,
    market.country,
    market.continent,
    market.category,
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase().includes(normalized))
}

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<ClimateMarket | null>(
    null,
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<MarketCategory | "all">("all")

  const visibleMarkets = useMemo(
    () =>
      demoMarkets.filter(
        (market) =>
          matchesSearch(market, search) &&
          (category === "all" || market.category === category),
      ),
    [category, search],
  )

  const selectRegion = useCallback((region: string) => {
    setSelectedRegion(region)
    setSelectedMarket(null)
    setIsDrawerOpen(true)
  }, [])

  const selectMarket = useCallback((market: ClimateMarket) => {
    setSelectedRegion(market.continent)
    setSelectedMarket(market)
    setIsDrawerOpen(true)
  }, [])

  const showRegionMarkets = useCallback(() => setSelectedMarket(null), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  const value = useMemo<MarketContextValue>(
    () => ({
      markets: demoMarkets,
      visibleMarkets,
      selectedRegion,
      selectedMarket,
      isDrawerOpen,
      search,
      category,
      setSearch,
      setCategory,
      selectRegion,
      selectMarket,
      showRegionMarkets,
      closeDrawer,
    }),
    [
      category,
      closeDrawer,
      isDrawerOpen,
      search,
      selectedMarket,
      selectedRegion,
      selectMarket,
      selectRegion,
      showRegionMarkets,
      visibleMarkets,
    ],
  )

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  )
}

export function useMarkets() {
  const value = useContext(MarketContext)
  if (!value) throw new Error("useMarkets must be used inside MarketProvider")
  return value
}
