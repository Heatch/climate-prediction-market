import { describe, expect, it } from "vitest"

import { POST as indexTransaction } from "@/app/api/index-transaction/route"
import { GET as getMarket } from "@/app/api/markets/[id]/route"
import { GET as getRegionMarkets } from "@/app/api/markets/region/[continent]/route"
import { GET as getMarkets } from "@/app/api/markets/route"
import { GET as getActivity } from "@/app/api/users/[wallet]/activity/route"
import { GET as getPositions } from "@/app/api/users/[wallet]/positions/route"
import { DEMO_WALLETS, demoMarkets } from "@/lib/markets/data"

interface ErrorBody {
  error: { code: string; message: string }
  meta: { isDemo: boolean; network: string; dataLabel: string }
}

describe("market API routes", () => {
  it("lists and filters sample markets with consistent metadata", async () => {
    const response = await getMarkets(
      new Request("http://localhost/api/markets?category=drought&status=open"),
    )
    const body = (await response.json()) as {
      data: {
        markets: Array<{ category: string; status: string }>
        total: number
      }
      meta: { isDemo: boolean; network: string; dataLabel: string }
    }

    expect(response.status).toBe(200)
    expect(body.data.total).toBe(1)
    expect(body.data.markets[0]).toMatchObject({
      category: "drought",
      status: "open",
    })
    expect(body.meta).toMatchObject({
      isDemo: true,
      network: "devnet",
      dataLabel: "SAMPLE DATA",
    })
  })

  it("returns structured validation errors", async () => {
    const response = await getMarkets(
      new Request("http://localhost/api/markets?limit=1000"),
    )
    const body = (await response.json()) as ErrorBody

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("VALIDATION_ERROR")
    expect(body.meta.isDemo).toBe(true)
  })

  it("gets a market by slug and returns a typed not-found response", async () => {
    const found = await getMarket(new Request("http://localhost"), {
      params: Promise.resolve({ id: "florida-category-4-hurricane-2026-demo" }),
    })
    const foundBody = (await found.json()) as {
      data: { market: { id: string } }
    }
    expect(foundBody.data.market.id).toBe("demo-fl-hurricane-2026")

    const missing = await getMarket(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing-market" }),
    })
    const missingBody = (await missing.json()) as ErrorBody
    expect(missing.status).toBe(404)
    expect(missingBody.error.code).toBe("MARKET_NOT_FOUND")
  })

  it("supports slug-based region lookup and status filtering", async () => {
    const response = await getRegionMarkets(
      new Request(
        "http://localhost/api/markets/region/north-america?status=open",
      ),
      { params: Promise.resolve({ continent: "north-america" }) },
    )
    const body = (await response.json()) as {
      data: {
        continent: string
        markets: Array<{ status: string }>
        total: number
      }
    }

    expect(response.status).toBe(200)
    expect(body.data.continent).toBe("North America")
    expect(body.data.total).toBeGreaterThanOrEqual(2)
    expect(body.data.markets.every((market) => market.status === "open")).toBe(
      true,
    )
  })
})

describe("wallet and transaction API routes", () => {
  it("returns positions for a valid wallet and rejects malformed keys", async () => {
    const response = await getPositions(new Request("http://localhost"), {
      params: Promise.resolve({ wallet: DEMO_WALLETS.atlas }),
    })
    const body = (await response.json()) as {
      data: { positions: unknown[]; total: number }
    }
    expect(response.status).toBe(200)
    expect(body.data.positions).toHaveLength(body.data.total)
    expect(body.data.total).toBeGreaterThan(0)

    const invalid = await getPositions(new Request("http://localhost"), {
      params: Promise.resolve({ wallet: "not-a-solana-key" }),
    })
    const invalidBody = (await invalid.json()) as ErrorBody
    expect(invalid.status).toBe(400)
    expect(invalidBody.error.code).toBe("VALIDATION_ERROR")
  })

  it("rejects malformed JSON when indexing", async () => {
    const response = await indexTransaction(
      new Request("http://localhost/api/index-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    )
    const body = (await response.json()) as ErrorBody

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("INVALID_JSON")
  })

  it("indexes valid metadata idempotently and exposes it in wallet activity", async () => {
    const signature = demoMarkets[8]!.resolution!.transactionSignature!
    const payload = {
      wallet: DEMO_WALLETS.boreal,
      marketId: "demo-fl-hurricane-2026",
      onchainMarketId: 1001,
      type: "purchase_no",
      status: "confirmed",
      side: "no",
      amountLamports: "125000000",
      transactionSignature: signature,
      timestamp: "2026-07-18T03:00:00.000Z",
    }
    const request = () =>
      new Request("http://localhost/api/index-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

    const created = await indexTransaction(request())
    const createdBody = (await created.json()) as {
      data: { created: boolean; activity: { explorerUrl: string } }
    }
    expect(created.status).toBe(201)
    expect(createdBody.data.created).toBe(true)
    expect(createdBody.data.activity.explorerUrl).toContain("cluster=devnet")

    const duplicate = await indexTransaction(request())
    const duplicateBody = (await duplicate.json()) as {
      data: { created: boolean }
    }
    expect(duplicate.status).toBe(200)
    expect(duplicateBody.data.created).toBe(false)

    const activity = await getActivity(new Request("http://localhost"), {
      params: Promise.resolve({ wallet: DEMO_WALLETS.boreal }),
    })
    const activityBody = (await activity.json()) as {
      data: { activity: Array<{ transactionSignature: string }> }
    }
    expect(
      activityBody.data.activity.some(
        (item) => item.transactionSignature === signature,
      ),
    ).toBe(true)
  })
})
