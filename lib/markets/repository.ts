import { demoMarkets, demoUserActivity, demoUserPositions } from "./data"
import { lamportsToSolNumber } from "./calculations"
import {
  MARKET_CONTINENTS,
  type ClimateMarket,
  type IndexedTransactionInput,
  type MarketContinent,
  type MarketHistoryPoint,
  type MarketListQuery,
  type MarketListResult,
  type UserActivity,
  type UserPosition,
} from "./types"

export type MarketRepositoryErrorCode =
  "MARKET_NOT_FOUND" | "MARKET_ID_MISMATCH" | "DUPLICATE_SIGNATURE"

export class MarketRepositoryError extends Error {
  readonly code: MarketRepositoryErrorCode

  constructor(code: MarketRepositoryErrorCode, message: string) {
    super(message)
    this.name = "MarketRepositoryError"
    this.code = code
  }
}

const indexedActivity: UserActivity[] = []

const cloneMarket = (market: ClimateMarket): ClimateMarket => ({
  ...market,
  history: market.history.map((point) => ({ ...point })),
  evidence: market.evidence.map((item) => ({ ...item })),
  recentTrades: market.recentTrades.map((trade) => ({ ...trade })),
  resolution: market.resolution ? { ...market.resolution } : undefined,
})

const clonePosition = (position: UserPosition): UserPosition => ({
  ...position,
})
const cloneActivity = (activity: UserActivity): UserActivity => ({
  ...activity,
})

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")

export const resolveContinent = (value: string): MarketContinent | null => {
  const normalized = normalizeText(value)
  return (
    MARKET_CONTINENTS.find(
      (continent) => normalizeText(continent) === normalized,
    ) ?? null
  )
}

const matchesSearch = (market: ClimateMarket, search: string): boolean => {
  const normalizedSearch = normalizeText(search)
  const searchable = [
    market.question,
    market.description,
    market.category,
    market.continent,
    market.country ?? "",
    market.region,
    market.resolutionSource,
  ]
    .join(" ")
    .toLocaleLowerCase("en-US")

  return searchable.includes(normalizedSearch)
}

export const queryMarkets = (query: MarketListQuery = {}): MarketListResult => {
  const offset = Math.max(0, query.offset ?? 0)
  const limit = Math.max(1, Math.min(100, query.limit ?? 100))

  const filtered = demoMarkets
    .filter((market) => !query.search || matchesSearch(market, query.search))
    .filter((market) => !query.category || market.category === query.category)
    .filter(
      (market) => !query.continent || market.continent === query.continent,
    )
    .filter((market) => !query.status || market.status === query.status)
    .filter(
      (market) =>
        query.featured === undefined || market.featured === query.featured,
    )
    .sort((left, right) => {
      if (left.featured !== right.featured) return left.featured ? -1 : 1
      if (left.trendingScore !== right.trendingScore)
        return right.trendingScore - left.trendingScore
      return left.question.localeCompare(right.question)
    })

  return {
    markets: filtered.slice(offset, offset + limit).map(cloneMarket),
    total: filtered.length,
    limit,
    offset,
  }
}

export const getMarkets = (query: MarketListQuery = {}): ClimateMarket[] =>
  queryMarkets(query).markets

export const getMarketById = (idOrSlug: string): ClimateMarket | null => {
  const normalized = idOrSlug.trim().toLocaleLowerCase("en-US")
  const market = demoMarkets.find(
    (candidate) =>
      candidate.id.toLocaleLowerCase("en-US") === normalized ||
      candidate.slug.toLocaleLowerCase("en-US") === normalized,
  )
  return market ? cloneMarket(market) : null
}

export const getMarketsByRegion = (
  continentOrSlug: string,
  query: Omit<MarketListQuery, "continent"> = {},
): ClimateMarket[] => {
  const continent = resolveContinent(continentOrSlug)
  if (!continent) return []
  return getMarkets({ ...query, continent })
}

export const getMarketHistory = (
  idOrSlug: string,
): MarketHistoryPoint[] | null => {
  const market = getMarketById(idOrSlug)
  return market ? market.history.map((point) => ({ ...point })) : null
}

export const getUserPositions = (wallet: string): UserPosition[] =>
  demoUserPositions
    .filter((position) => position.wallet === wallet)
    .sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )
    .map(clonePosition)

export const getUserActivity = (wallet: string): UserActivity[] =>
  [...demoUserActivity, ...indexedActivity]
    .filter((activity) => activity.wallet === wallet)
    .sort(
      (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
    )
    .map(cloneActivity)

const sideForActivity = (
  input: IndexedTransactionInput,
): "yes" | "no" | undefined => {
  if (input.type === "purchase_yes") return "yes"
  if (input.type === "purchase_no") return "no"
  return input.side
}

export interface IndexTransactionResult {
  activity: UserActivity
  created: boolean
}

/**
 * Indexes a transaction in process memory for the demo repository. This is
 * intentionally non-authoritative and may be cleared by a server restart.
 */
export const indexTransaction = (
  input: IndexedTransactionInput,
): IndexTransactionResult => {
  const market = getMarketById(input.marketId)
  if (!market) {
    throw new MarketRepositoryError(
      "MARKET_NOT_FOUND",
      `Market '${input.marketId}' was not found.`,
    )
  }
  if (market.onchainMarketId !== input.onchainMarketId) {
    throw new MarketRepositoryError(
      "MARKET_ID_MISMATCH",
      "The on-chain market identifier does not match the requested market.",
    )
  }

  const existing = [...demoUserActivity, ...indexedActivity].find(
    (activity) => activity.transactionSignature === input.transactionSignature,
  )
  if (existing) {
    if (
      existing.wallet !== input.wallet ||
      existing.marketId !== market.id ||
      existing.type !== input.type
    ) {
      throw new MarketRepositoryError(
        "DUPLICATE_SIGNATURE",
        "This transaction signature is already indexed with different metadata.",
      )
    }
    return { activity: cloneActivity(existing), created: false }
  }

  const side = sideForActivity(input)
  const timestamp = input.timestamp ?? new Date().toISOString()
  const amountSol =
    input.amountLamports === undefined
      ? undefined
      : lamportsToSolNumber(input.amountLamports)
  const activity: UserActivity = {
    id: `indexed-${input.transactionSignature.slice(0, 20)}`,
    wallet: input.wallet,
    marketId: market.id,
    onchainMarketId: input.onchainMarketId,
    type: input.type,
    status: input.status,
    side,
    amountLamports: input.amountLamports,
    amountSol,
    transactionSignature: input.transactionSignature,
    explorerUrl: `https://explorer.solana.com/tx/${input.transactionSignature}?cluster=devnet`,
    timestamp,
    failureReason: input.failureReason,
    network: "devnet",
    isDemo: true,
  }

  indexedActivity.push(activity)
  return { activity: cloneActivity(activity), created: true }
}
