/**
 * Shared cool→hot color ramp used to express how likely a market's YES outcome
 * is. Kept dependency-free so it can be used in lightweight card rendering as
 * well as the canvas globe, guaranteeing both surfaces use the same scale.
 */
export const LIKELIHOOD_STOPS = [
  "#2563eb",
  "#22d3ee",
  "#4ade80",
  "#facc15",
  "#fb923c",
  "#ef4444",
] as const

export const LIKELIHOOD_GRADIENT = `linear-gradient(90deg, ${LIKELIHOOD_STOPS.join(
  ", ",
)})`

export function clampProbability(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "")
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

const STOP_RGB = LIKELIHOOD_STOPS.map(hexToRgb)

/**
 * Piecewise-linear interpolation across the stops, returning an `rgb(...)`
 * string. Higher probabilities map to warmer colors.
 */
export function likelihoodColor(probability: number): string {
  const normalized = clampProbability(probability)
  const segments = STOP_RGB.length - 1
  const scaled = normalized * segments
  const index = Math.min(segments - 1, Math.floor(scaled))
  const t = scaled - index
  const from = STOP_RGB[index]!
  const to = STOP_RGB[index + 1]!
  const channel = (component: 0 | 1 | 2) =>
    Math.round(from[component] + (to[component] - from[component]) * t)
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}
