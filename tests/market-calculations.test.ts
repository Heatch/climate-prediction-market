import { describe, expect, it } from "vitest"

import {
  calculateCancelledRefundLamports,
  calculateImpliedProbabilities,
  calculatePayoutLamports,
  calculatePooledTradeQuote,
  formatLamportsAsSol,
  getMarketTradingState,
  MarketCalculationError,
  parseLamports,
  solToLamports,
  U64_MAX,
} from "@/lib/markets/calculations"
import { DEMO_WALLETS, demoMarkets } from "@/lib/markets/data"
import {
  getMarketById,
  getMarkets,
  getMarketsByRegion,
  getUserPositions,
} from "@/lib/markets/repository"
import {
  climateMarketSchema,
  indexTransactionSchema,
  isSolanaPublicKey,
  isSolanaTransactionSignature,
} from "@/lib/validation/marketSchemas"

describe("pooled market calculations", () => {
  it("derives complementary implied probabilities from pool balances", () => {
    expect(
      calculateImpliedProbabilities("600000000000", "400000000000"),
    ).toEqual({
      yes: 0.6,
      no: 0.4,
      yesBasisPoints: 6_000,
      noBasisPoints: 4_000,
    })
  })

  it("uses a neutral display probability for an empty pool", () => {
    expect(calculateImpliedProbabilities(0n, 0n)).toEqual({
      yes: 0.5,
      no: 0.5,
      yesBasisPoints: 5_000,
      noBasisPoints: 5_000,
    })
  })

  it("uses checked integer arithmetic for proportional payouts", () => {
    expect(calculatePayoutLamports(3n, 10n, 6n)).toBe(5n)
    expect(calculatePayoutLamports(1n, 10n, 6n)).toBe(1n)
  })

  it("rejects impossible payout pool states", () => {
    expect(() => calculatePayoutLamports(1n, 10n, 0n)).toThrowError(
      MarketCalculationError,
    )
    expect(() => calculatePayoutLamports(7n, 10n, 6n)).toThrowError(
      "The user position cannot exceed the winning-side pool.",
    )
    expect(() => calculatePayoutLamports(1n, 4n, 6n)).toThrowError(
      "The winning-side pool cannot exceed the total market pool.",
    )
  })

  it("refunds both sides after cancellation and guards u64 overflow", () => {
    expect(calculateCancelledRefundLamports(2_000n, 3_000n)).toBe(5_000n)
    expect(() => calculateCancelledRefundLamports(U64_MAX, 1n)).toThrowError(
      "Refund exceeds the Solana u64 range.",
    )
  })

  it("converts between SOL and lamports without floating point settlement math", () => {
    expect(solToLamports("1.234567891")).toBe(1_234_567_891n)
    expect(solToLamports(0.000000001)).toBe(1n)
    expect(formatLamportsAsSol(1_234_567_891n)).toBe("1.234567891")
    expect(formatLamportsAsSol(2_000_000_000n)).toBe("2")
    expect(() => solToLamports("0.0000000001")).toThrowError(
      "at most 9 decimal places",
    )
  })

  it("rejects unsafe numeric lamport inputs", () => {
    expect(() => parseLamports(Number.MAX_SAFE_INTEGER + 1)).toThrowError(
      "safe integer",
    )
    expect(() => parseLamports("-1")).toThrowError("decimal integer")
    expect(() => parseLamports((U64_MAX + 1n).toString())).toThrowError(
      "u64 range",
    )
  })

  it("quotes a purchase including probability movement, payout, and fee", () => {
    const quote = calculatePooledTradeQuote({
      side: "yes",
      amountLamports: solToLamports("100"),
      yesPoolLamports: solToLamports("600"),
      noPoolLamports: solToLamports("400"),
      walletBalanceLamports: solToLamports("101"),
    })

    expect(quote.selectedProbabilityBefore).toBe(0.6)
    expect(quote.yesProbabilityAfter).toBe(0.6364)
    expect(quote.noProbabilityAfter).toBe(0.3636)
    expect(quote.priceImpactBasisPoints).toBe(364)
    expect(quote.priceImpactLevel).toBe("high")
    expect(quote.potentialPayoutLamports).toBe(157_142_857_142n)
    expect(quote.averageExecutionPrice).toBeCloseTo(0.636_363_636, 8)
    expect(quote.totalDebitLamports).toBe(100_000_005_000n)
  })

  it("prevents zero-value and over-balance purchase previews", () => {
    expect(() =>
      calculatePooledTradeQuote({
        side: "yes",
        amountLamports: 0n,
        yesPoolLamports: 10n,
        noPoolLamports: 10n,
      }),
    ).toThrowError("greater than zero")

    expect(() =>
      calculatePooledTradeQuote({
        side: "no",
        amountLamports: 10_000n,
        yesPoolLamports: 50_000n,
        noPoolLamports: 50_000n,
        walletBalanceLamports: 14_999n,
      }),
    ).toThrowError("Wallet balance must cover")
  })

  it("blocks trading based on status or an elapsed close time", () => {
    expect(
      getMarketTradingState(
        { status: "open", closeTime: "2026-12-31T23:59:59.000Z" },
        new Date("2026-07-18T00:00:00.000Z"),
      ),
    ).toEqual({ canTrade: true, code: "tradeable" })

    expect(
      getMarketTradingState(
        { status: "closed", closeTime: "2026-12-31T23:59:59.000Z" },
        new Date("2026-07-18T00:00:00.000Z"),
      ),
    ).toMatchObject({ canTrade: false, code: "not_open" })

    expect(
      getMarketTradingState(
        { status: "open", closeTime: "2026-07-01T00:00:00.000Z" },
        new Date("2026-07-18T00:00:00.000Z"),
      ),
    ).toMatchObject({ canTrade: false, code: "close_time_reached" })
  })
})

describe("demo market data and repository", () => {
  it("contains valid, clearly labelled markets across every required geography", () => {
    expect(demoMarkets).toHaveLength(9)
    expect(new Set(demoMarkets.map((market) => market.continent))).toEqual(
      new Set([
        "North America",
        "South America",
        "Europe",
        "Africa",
        "Asia",
        "Oceania",
      ]),
    )
    expect(new Set(demoMarkets.map((market) => market.status))).toEqual(
      new Set(["open", "closed", "resolved", "cancelled"]),
    )

    for (const market of demoMarkets) {
      const validation = climateMarketSchema.safeParse(market)
      expect(
        validation.success,
        validation.success
          ? undefined
          : JSON.stringify(validation.error.issues),
      ).toBe(true)
      expect(market.question).toContain("[DEMO]")
      expect(market.dataLabel).toBe("SAMPLE DATA")
      expect(market.history.length).toBeGreaterThanOrEqual(6)
      expect(market.evidence.length).toBeGreaterThanOrEqual(2)
      expect(market.recentTrades.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("queries by id, slug, search, category, and continent", () => {
    const florida = getMarketById("demo-fl-hurricane-2026")
    expect(florida?.category).toBe("hurricane")
    expect(getMarketById("florida-category-4-hurricane-2026-demo")?.id).toBe(
      florida?.id,
    )
    expect(
      getMarkets({ search: "California", category: "drought" }),
    ).toHaveLength(1)
    expect(getMarketsByRegion("north-america").length).toBeGreaterThanOrEqual(3)
    expect(getMarketsByRegion("Oceania")[0]?.category).toBe("wildfire")
  })

  it("returns copies so callers cannot mutate the seed repository", () => {
    const firstRead = getMarketById("demo-fl-hurricane-2026")
    expect(firstRead).not.toBeNull()
    if (!firstRead) return

    firstRead.question = "mutated"
    firstRead.history[0]!.yesProbability = 0
    const secondRead = getMarketById("demo-fl-hurricane-2026")

    expect(secondRead?.question).toContain("[DEMO]")
    expect(secondRead?.history[0]?.yesProbability).not.toBe(0)
  })

  it("returns seeded positions for the sample wallet", () => {
    const positions = getUserPositions(DEMO_WALLETS.atlas)
    expect(positions.map((position) => position.status)).toEqual(
      expect.arrayContaining(["open", "claimable", "refundable"]),
    )
  })
})

describe("transaction validation", () => {
  it("validates byte-accurate Solana keys and signatures", () => {
    const trade = demoMarkets[0]!.recentTrades[0]!
    expect(isSolanaPublicKey(DEMO_WALLETS.atlas)).toBe(true)
    expect(isSolanaPublicKey("not-a-wallet")).toBe(false)
    expect(isSolanaTransactionSignature(trade.transactionSignature ?? "")).toBe(
      true,
    )
  })

  it("requires a positive amount for purchase indexing", () => {
    const transactionSignature =
      demoMarkets[0]!.recentTrades[0]!.transactionSignature!
    const result = indexTransactionSchema.safeParse({
      wallet: DEMO_WALLETS.atlas,
      marketId: "demo-fl-hurricane-2026",
      onchainMarketId: 1001,
      type: "purchase_yes",
      status: "confirmed",
      side: "yes",
      amountLamports: "0",
      transactionSignature,
    })

    expect(result.success).toBe(false)
  })
})
