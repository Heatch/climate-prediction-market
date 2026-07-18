import type { ClimateMarket, TradeSide } from "./types"

export const LAMPORTS_PER_SOL = 1_000_000_000n
export const U64_MAX = 18_446_744_073_709_551_615n
export const DEFAULT_NETWORK_FEE_LAMPORTS = 5_000n
export const PROBABILITY_BASIS_POINTS = 10_000n

export type LamportInput = bigint | number | string

export type MarketCalculationErrorCode =
  | "INVALID_AMOUNT"
  | "AMOUNT_OUT_OF_RANGE"
  | "ARITHMETIC_OVERFLOW"
  | "INVALID_POOL_STATE"
  | "INSUFFICIENT_BALANCE"

export class MarketCalculationError extends Error {
  readonly code: MarketCalculationErrorCode

  constructor(code: MarketCalculationErrorCode, message: string) {
    super(message)
    this.name = "MarketCalculationError"
    this.code = code
  }
}

const assertU64 = (value: bigint, label: string): bigint => {
  if (value < 0n) {
    throw new MarketCalculationError(
      "INVALID_AMOUNT",
      `${label} cannot be negative.`,
    )
  }

  if (value > U64_MAX) {
    throw new MarketCalculationError(
      "AMOUNT_OUT_OF_RANGE",
      `${label} exceeds the Solana u64 range.`,
    )
  }

  return value
}

export const parseLamports = (
  value: LamportInput,
  label = "Amount",
): bigint => {
  let parsed: bigint

  if (typeof value === "bigint") {
    parsed = value
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new MarketCalculationError(
        "INVALID_AMOUNT",
        `${label} must be supplied as a safe integer, bigint, or decimal integer string.`,
      )
    }
    parsed = BigInt(value)
  } else {
    const normalized = value.trim()
    if (!/^\d+$/.test(normalized)) {
      throw new MarketCalculationError(
        "INVALID_AMOUNT",
        `${label} must be a decimal integer.`,
      )
    }
    parsed = BigInt(normalized)
  }

  return assertU64(parsed, label)
}

const checkedAdd = (left: bigint, right: bigint, label: string): bigint => {
  const result = left + right
  if (result > U64_MAX) {
    throw new MarketCalculationError(
      "ARITHMETIC_OVERFLOW",
      `${label} exceeds the Solana u64 range.`,
    )
  }
  return result
}

export interface ImpliedProbabilities {
  yes: number
  no: number
  yesBasisPoints: number
  noBasisPoints: number
}

/**
 * Calculates the MVP pooled implied probability. Empty pools are displayed as
 * 50/50; otherwise YES = yes pool / total pool and NO is its exact complement.
 */
export const calculateImpliedProbabilities = (
  yesPoolLamports: LamportInput,
  noPoolLamports: LamportInput,
): ImpliedProbabilities => {
  const yesPool = parseLamports(yesPoolLamports, "YES pool")
  const noPool = parseLamports(noPoolLamports, "NO pool")
  const totalPool = checkedAdd(yesPool, noPool, "Total pool")

  if (totalPool === 0n) {
    return { yes: 0.5, no: 0.5, yesBasisPoints: 5_000, noBasisPoints: 5_000 }
  }

  const roundedYesBasisPoints = Number(
    (yesPool * PROBABILITY_BASIS_POINTS + totalPool / 2n) / totalPool,
  )
  const yesBasisPoints = Math.max(0, Math.min(10_000, roundedYesBasisPoints))
  const noBasisPoints = 10_000 - yesBasisPoints

  return {
    yes: yesBasisPoints / 10_000,
    no: noBasisPoints / 10_000,
    yesBasisPoints,
    noBasisPoints,
  }
}

/**
 * Pooled settlement formula, using integer division as the on-chain program does:
 * user position × total pool ÷ winning-side pool.
 */
export const calculatePayoutLamports = (
  userWinningPositionLamports: LamportInput,
  totalMarketPoolLamports: LamportInput,
  totalWinningSidePoolLamports: LamportInput,
): bigint => {
  const userPosition = parseLamports(
    userWinningPositionLamports,
    "Winning position",
  )
  const totalPool = parseLamports(totalMarketPoolLamports, "Total market pool")
  const winningPool = parseLamports(
    totalWinningSidePoolLamports,
    "Winning-side pool",
  )

  if (winningPool === 0n) {
    throw new MarketCalculationError(
      "INVALID_POOL_STATE",
      "A payout cannot be calculated when the winning-side pool is empty.",
    )
  }
  if (winningPool > totalPool) {
    throw new MarketCalculationError(
      "INVALID_POOL_STATE",
      "The winning-side pool cannot exceed the total market pool.",
    )
  }
  if (userPosition > winningPool) {
    throw new MarketCalculationError(
      "INVALID_POOL_STATE",
      "The user position cannot exceed the winning-side pool.",
    )
  }

  const payout = (userPosition * totalPool) / winningPool
  return assertU64(payout, "Payout")
}

export const calculateCancelledRefundLamports = (
  yesPositionLamports: LamportInput,
  noPositionLamports: LamportInput,
): bigint => {
  const yesPosition = parseLamports(yesPositionLamports, "YES position")
  const noPosition = parseLamports(noPositionLamports, "NO position")
  return checkedAdd(yesPosition, noPosition, "Refund")
}

export const solToLamports = (amountSol: string | number): bigint => {
  let normalized: string

  if (typeof amountSol === "number") {
    if (!Number.isFinite(amountSol) || amountSol < 0) {
      throw new MarketCalculationError(
        "INVALID_AMOUNT",
        "SOL amount must be a finite non-negative value.",
      )
    }

    normalized = amountSol.toFixed(9)
    const roundedValue = Number(normalized)
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(amountSol)) * 4
    if (Math.abs(roundedValue - amountSol) > tolerance) {
      throw new MarketCalculationError(
        "INVALID_AMOUNT",
        "SOL amount cannot have more than 9 decimal places.",
      )
    }
  } else {
    normalized = amountSol.trim()
  }

  const match = /^(0|[1-9]\d*)(?:\.(\d{1,9}))?$/.exec(normalized)
  if (!match) {
    throw new MarketCalculationError(
      "INVALID_AMOUNT",
      "SOL amount must be a non-negative decimal with at most 9 decimal places.",
    )
  }

  const whole = BigInt(match[1]!)
  const fractional = (match[2] ?? "").padEnd(9, "0")
  const lamports = whole * LAMPORTS_PER_SOL + BigInt(fractional || "0")
  return assertU64(lamports, "SOL amount")
}

export const formatLamportsAsSol = (lamportsInput: LamportInput): string => {
  const lamports = parseLamports(lamportsInput)
  const whole = lamports / LAMPORTS_PER_SOL
  const fraction = (lamports % LAMPORTS_PER_SOL)
    .toString()
    .padStart(9, "0")
    .replace(/0+$/, "")
  return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString()
}

export const lamportsToSolNumber = (lamportsInput: LamportInput): number =>
  Number(parseLamports(lamportsInput)) / Number(LAMPORTS_PER_SOL)

export type PriceImpactLevel = "none" | "low" | "moderate" | "high"

export interface PooledTradeQuoteInput {
  side: TradeSide
  amountLamports: LamportInput
  yesPoolLamports: LamportInput
  noPoolLamports: LamportInput
  walletBalanceLamports?: LamportInput
  networkFeeLamports?: LamportInput
}

export interface PooledTradeQuote {
  side: TradeSide
  amountLamports: bigint
  amountSol: number
  networkFeeLamports: bigint
  networkFeeSol: number
  totalDebitLamports: bigint
  selectedProbabilityBefore: number
  selectedProbabilityAfter: number
  yesProbabilityAfter: number
  noProbabilityAfter: number
  averageExecutionPrice: number
  estimatedPositionLamports: bigint
  estimatedShares: number
  potentialPayoutLamports: bigint
  potentialPayoutSol: number
  priceImpact: number
  priceImpactBasisPoints: number
  priceImpactLevel: PriceImpactLevel
  model: "pooled-binary"
}

const getPriceImpactLevel = (
  priceImpactBasisPoints: number,
): PriceImpactLevel => {
  if (priceImpactBasisPoints === 0) return "none"
  if (priceImpactBasisPoints <= 100) return "low"
  if (priceImpactBasisPoints <= 300) return "moderate"
  return "high"
}

/**
 * Returns a deterministic preview for the pooled-binary MVP. Positions are
 * deposits, not transferable order-book shares. `estimatedShares` is the gross
 * SOL payout equivalent if the selected side wins with no later deposits.
 */
export const calculatePooledTradeQuote = ({
  side,
  amountLamports,
  yesPoolLamports,
  noPoolLamports,
  walletBalanceLamports,
  networkFeeLamports = DEFAULT_NETWORK_FEE_LAMPORTS,
}: PooledTradeQuoteInput): PooledTradeQuote => {
  const amount = parseLamports(amountLamports, "Purchase amount")
  const yesPool = parseLamports(yesPoolLamports, "YES pool")
  const noPool = parseLamports(noPoolLamports, "NO pool")
  const networkFee = parseLamports(networkFeeLamports, "Network fee")

  if (amount === 0n) {
    throw new MarketCalculationError(
      "INVALID_AMOUNT",
      "Purchase amount must be greater than zero.",
    )
  }

  const totalDebit = checkedAdd(amount, networkFee, "Total wallet debit")
  if (walletBalanceLamports !== undefined) {
    const walletBalance = parseLamports(walletBalanceLamports, "Wallet balance")
    if (totalDebit > walletBalance) {
      throw new MarketCalculationError(
        "INSUFFICIENT_BALANCE",
        "Wallet balance must cover both the purchase and estimated network fee.",
      )
    }
  }

  const before = calculateImpliedProbabilities(yesPool, noPool)
  const yesPoolAfter =
    side === "yes" ? checkedAdd(yesPool, amount, "YES pool") : yesPool
  const noPoolAfter =
    side === "no" ? checkedAdd(noPool, amount, "NO pool") : noPool
  const totalPoolAfter = checkedAdd(yesPoolAfter, noPoolAfter, "Total pool")
  const selectedPoolAfter = side === "yes" ? yesPoolAfter : noPoolAfter
  const after = calculateImpliedProbabilities(yesPoolAfter, noPoolAfter)
  const selectedProbabilityBefore = side === "yes" ? before.yes : before.no
  const selectedProbabilityAfter = side === "yes" ? after.yes : after.no
  const potentialPayout = calculatePayoutLamports(
    amount,
    totalPoolAfter,
    selectedPoolAfter,
  )
  const averageExecutionPrice = Number(amount) / Number(potentialPayout)
  const priceImpactBasisPoints = Math.abs(
    (side === "yes" ? after.yesBasisPoints : after.noBasisPoints) -
      (side === "yes" ? before.yesBasisPoints : before.noBasisPoints),
  )

  return {
    side,
    amountLamports: amount,
    amountSol: lamportsToSolNumber(amount),
    networkFeeLamports: networkFee,
    networkFeeSol: lamportsToSolNumber(networkFee),
    totalDebitLamports: totalDebit,
    selectedProbabilityBefore,
    selectedProbabilityAfter,
    yesProbabilityAfter: after.yes,
    noProbabilityAfter: after.no,
    averageExecutionPrice,
    estimatedPositionLamports: amount,
    estimatedShares: lamportsToSolNumber(potentialPayout),
    potentialPayoutLamports: potentialPayout,
    potentialPayoutSol: lamportsToSolNumber(potentialPayout),
    priceImpact: priceImpactBasisPoints / 10_000,
    priceImpactBasisPoints,
    priceImpactLevel: getPriceImpactLevel(priceImpactBasisPoints),
    model: "pooled-binary",
  }
}

export const calculateMarketProbabilities = (
  market: Pick<ClimateMarket, "yesLiquidity" | "noLiquidity">,
): ImpliedProbabilities =>
  calculateImpliedProbabilities(
    solToLamports(market.yesLiquidity),
    solToLamports(market.noLiquidity),
  )

export type MarketTradingStateCode =
  "tradeable" | "not_open" | "close_time_reached"

export interface MarketTradingState {
  canTrade: boolean
  code: MarketTradingStateCode
  reason?: string
}

export const getMarketTradingState = (
  market: Pick<ClimateMarket, "status" | "closeTime">,
  now: Date = new Date(),
): MarketTradingState => {
  if (market.status !== "open") {
    return {
      canTrade: false,
      code: "not_open",
      reason: `This market is ${market.status} and no longer accepts purchases.`,
    }
  }

  const closeTime = Date.parse(market.closeTime)
  if (!Number.isFinite(closeTime)) {
    throw new MarketCalculationError(
      "INVALID_POOL_STATE",
      "Market close time is invalid.",
    )
  }

  if (now.getTime() >= closeTime) {
    return {
      canTrade: false,
      code: "close_time_reached",
      reason: "The market closing time has been reached.",
    }
  }

  return { canTrade: true, code: "tradeable" }
}

export const canTradeMarket = (
  market: Pick<ClimateMarket, "status" | "closeTime">,
  now: Date = new Date(),
): boolean => getMarketTradingState(market, now).canTrade
