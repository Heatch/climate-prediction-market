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
