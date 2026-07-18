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

/**
 * Short, recognizable hazard marks shared by the globe and market panels.
 * Labels always accompany these glyphs in accessible names; they are never the
 * only way the category is communicated.
 */
export const CATEGORY_SYMBOLS: Record<MarketCategory, string> = {
  hurricane: "🌀",
  drought: "☀️",
  temperature: "🌡️",
  rainfall: "🌧️",
  flooding: "🌊",
  "crop-yield": "🌱",
  wildfire: "🔥",
  other: "⚠️",
}

export const CATEGORY_ACCENTS: Record<MarketCategory, string> = {
  hurricane: "#60a5fa",
  drought: "#facc15",
  temperature: "#fb7185",
  rainfall: "#67e8f9",
  flooding: "#38bdf8",
  "crop-yield": "#a3e635",
  wildfire: "#fb923c",
  other: "#c4b5fd",
}
