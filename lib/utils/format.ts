export function formatProbability(value: number) {
  const normalized = value > 1 ? value : value * 100
  return `${Math.round(normalized)}%`
}

export function formatSol(value: number, maximumFractionDigits = 2) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits:
      value > 0 && value < 0.1 ? Math.min(3, maximumFractionDigits) : 0,
  }).format(value)} SOL`
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date)
}

export function formatCountdown(value: string, now = Date.now()) {
  const target = new Date(value).getTime()
  if (Number.isNaN(target)) return "Deadline unavailable"
  const difference = target - now
  if (difference <= 0) return "Trading ended"

  const days = Math.floor(difference / 86_400_000)
  const hours = Math.floor((difference % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h remaining`
  const minutes = Math.max(1, Math.floor((difference % 3_600_000) / 60_000))
  return `${hours}h ${minutes}m remaining`
}

export function shortenAddress(value: string, edge = 4) {
  if (value.length <= edge * 2 + 1) return value
  return `${value.slice(0, edge)}…${value.slice(-edge)}`
}
