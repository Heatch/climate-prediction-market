import type { MarketCategory } from "./types"

export const CATEGORY_LABELS: Record<MarketCategory, string> = {
  hurricane: "Hurricanes",
  drought: "Drought",
  temperature: "Temperature",
  rainfall: "Rainfall",
  flooding: "Flooding",
  "crop-yield": "Crops",
  wildfire: "Wildfire",
  other: "Other",
}

export const CATEGORY_ACCENTS: Record<MarketCategory, string> = {
  hurricane: "#a78bfa",
  drought: "#fbbf24",
  temperature: "#fb7185",
  rainfall: "#67e8f9",
  flooding: "#60a5fa",
  "crop-yield": "#a3e635",
  wildfire: "#fb923c",
  other: "#cbd5e1",
}

export const CATEGORY_SYMBOLS: Record<MarketCategory, string> = {
  hurricane: "cyclone",
  drought: "sun-crack",
  temperature: "thermometer",
  rainfall: "rain-cloud",
  flooding: "flooded-house",
  "crop-yield": "wheat",
  wildfire: "flame",
  other: "warning",
}

export const HAZARD_MARKER_EFFECTS = {
  default: { haloAlpha: "1f", haloExpansion: 2.5, shadowBlur: 0 },
  hovered: { haloAlpha: "38", haloExpansion: 4, shadowBlur: 6 },
  selected: { haloAlpha: "52", haloExpansion: 5, shadowBlur: 8 },
} as const

type CategorizedMarket = {
  id: string
  category: MarketCategory
}

export function resolveClusterHazardCategory(
  markets: readonly CategorizedMarket[],
  selectedMarketId?: string | null,
): MarketCategory | null {
  const selectedMarket = markets.find(
    (market) => market.id === selectedMarketId,
  )
  if (selectedMarket) return selectedMarket.category

  let dominantCategory: MarketCategory | null = markets[0]?.category ?? null
  let dominantCount = 0
  const categoryCounts = new Map<MarketCategory, number>()

  for (const market of markets) {
    const count = (categoryCounts.get(market.category) ?? 0) + 1
    categoryCounts.set(market.category, count)
    if (count > dominantCount) {
      dominantCategory = market.category
      dominantCount = count
    }
  }

  return dominantCategory
}
