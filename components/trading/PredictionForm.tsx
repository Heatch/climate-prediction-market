"use client"

import { useEffect, useMemo, useState } from "react"

import { usePositions } from "@/components/providers/PositionProvider"
import { useSolanaWallet } from "@/components/providers/SolanaProvider"
import useMarketProgram from "@/hooks/useMarketProgram"
import type { ClimateMarket, TradeSide } from "@/lib/markets/types"
import { getExplorerTransactionUrl } from "@/lib/solana/config"
import { formatProbability, formatSol } from "@/lib/utils/format"

const QUICK_AMOUNTS = [0.05, 0.1, 0.25, 0.5]
const DEFAULT_NETWORK_FEE_SOL = 0.000005

interface PredictionFormProps {
  market: ClimateMarket
}

function parseAmount(value: string) {
  if (!/^\d*(?:\.\d{0,9})?$/.test(value.trim())) return Number.NaN
  return Number(value)
}

export default function PredictionForm({ market }: PredictionFormProps) {
  const { connected, publicKey } = useSolanaWallet()
  const { recordPurchase } = usePositions()
  const { buy, balanceLamports, state, isPending, isConfigured, reset } =
    useMarketProgram(market)
  const [side, setSide] = useState<TradeSide>("yes")
  const [amount, setAmount] = useState("0.1")
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState<number | null>(null)

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now())
    updateCurrentTime()
    const timer = window.setInterval(updateCurrentTime, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const amountSol = parseAmount(amount)
  const balanceSol =
    balanceLamports === null ? null : Number(balanceLamports) / 1_000_000_000
  const quote = useMemo(() => {
    const safeAmount =
      Number.isFinite(amountSol) && amountSol > 0 ? amountSol : 0
    const totalPool = market.yesLiquidity + market.noLiquidity
    const selectedPool =
      side === "yes" ? market.yesLiquidity : market.noLiquidity
    const currentProbability = totalPool > 0 ? selectedPool / totalPool : 0.5
    const nextTotalPool = totalPool + safeAmount
    const nextSelectedPool = selectedPool + safeAmount
    const nextProbability =
      nextTotalPool > 0 ? nextSelectedPool / nextTotalPool : currentProbability
    const estimatedPayout =
      nextSelectedPool > 0 ? (safeAmount * nextTotalPool) / nextSelectedPool : 0
    const averageExecutionPrice =
      estimatedPayout > 0 ? safeAmount / estimatedPayout : 0
    return {
      currentProbability,
      nextProbability,
      priceImpact: Math.max(0, (nextProbability - currentProbability) * 100),
      estimatedPayout,
      averageExecutionPrice,
      positionUnits: safeAmount,
    }
  }, [amountSol, market.noLiquidity, market.yesLiquidity, side])

  const validationError = useMemo(() => {
    if (!connected || !publicKey)
      return "Connect a Solana wallet to purchase a position."
    if (!isConfigured)
      return "Deploy the program and set NEXT_PUBLIC_PROGRAM_ID before trading."
    if (market.status !== "open")
      return `This market is ${market.status}; purchases are unavailable.`
    if (
      currentTime !== null &&
      new Date(market.closeTime).getTime() <= currentTime
    ) {
      return "This market has reached its trading deadline."
    }
    if (!Number.isFinite(amountSol))
      return "Enter a valid SOL amount with up to 9 decimal places."
    if (amountSol <= 0) return "Amount must be greater than zero."
    if (
      balanceSol !== null &&
      amountSol + DEFAULT_NETWORK_FEE_SOL > balanceSol
    ) {
      return "Amount plus the estimated network fee exceeds your wallet balance."
    }
    return null
  }, [
    amountSol,
    balanceSol,
    connected,
    currentTime,
    isConfigured,
    market.closeTime,
    market.status,
    publicKey,
  ])

  const submit = async () => {
    if (validationError || isPending) return
    try {
      const result = await buy(side, amount)
      recordPurchase({
        marketId: market.id,
        marketQuestion: market.question,
        region: market.region,
        side,
        amountSol,
        estimatedPayoutSol: quote.estimatedPayout,
        signature: result.signature,
      })

      if (publicKey) {
        void fetch("/api/index-transaction", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            marketId: market.id,
            onchainMarketId: market.onchainMarketId,
            type: side === "yes" ? "purchase_yes" : "purchase_no",
            status: "confirmed",
            side,
            amountLamports: Math.round(amountSol * 1_000_000_000).toString(),
            transactionSignature: result.signature,
          }),
        }).catch(() => undefined)
      }
    } catch {
      // The hook maps and exposes a user-safe error in state.
    }
  }

  const loadingLabel: Record<string, string> = {
    preparing: "Preparing accounts…",
    simulating: "Simulating on Devnet…",
    awaiting_signature: "Approve in your wallet…",
    confirming: "Confirming transaction…",
  }

  return (
    <section
      className="mt-6 rounded-2xl border border-neutral-300 bg-white p-4 sm:p-5"
      aria-labelledby="position-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Take a position</p>
          <h3 id="position-heading" className="mt-1 text-lg font-semibold">
            Trade with Devnet SOL
          </h3>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
          Pooled MVP
        </span>
      </div>

      <div
        className="mt-4 grid grid-cols-2 gap-2"
        role="group"
        aria-label="Select a market outcome"
      >
        {(["yes", "no"] as const).map((outcome) => {
          const selected = side === outcome
          const probability =
            outcome === "yes" ? market.yesPrice : market.noPrice
          return (
            <button
              key={outcome}
              type="button"
              aria-pressed={selected}
              disabled={isPending}
              onClick={() => {
                setSide(outcome)
                reset()
              }}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? outcome === "yes"
                    ? "border-ink bg-ink text-white"
                    : "border-ink bg-neutral-100 text-ink"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400"
              }`}
            >
              <span className="block text-[9px] font-bold uppercase tracking-wider">
                Buy {outcome.toUpperCase()}
              </span>
              <span className="tabular mt-1 block text-xl font-semibold">
                {formatProbability(probability)}
              </span>
              <span className="mt-1 block text-[9px] opacity-70">
                {outcome === "yes" ? "Solid marker" : "Outlined marker"}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-4">
          <label
            htmlFor={`amount-${market.id}`}
            className="text-[10px] font-bold uppercase tracking-wider text-neutral-500"
          >
            Amount
          </label>
          <span className="tabular text-[10px] text-neutral-500">
            Balance:{" "}
            {balanceSol === null
              ? connected
                ? "Loading…"
                : "Not connected"
              : formatSol(balanceSol, 4)}
          </span>
        </div>
        <div className="relative mt-1.5">
          <input
            id={`amount-${market.id}`}
            data-testid="trade-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            disabled={isPending}
            onChange={(event) => {
              setAmount(event.target.value)
              reset()
            }}
            aria-describedby={`amount-error-${market.id}`}
            className="tabular h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 pr-14 text-lg font-semibold outline-none transition focus:border-ink focus:ring-1 focus:ring-ink"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">
            SOL
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {QUICK_AMOUNTS.map((quickAmount) => (
            <button
              type="button"
              key={quickAmount}
              disabled={isPending}
              onClick={() => {
                setAmount(String(quickAmount))
                reset()
              }}
              className="rounded-lg border border-neutral-200 py-1.5 text-[10px] font-semibold transition hover:border-ink hover:bg-neutral-50"
            >
              {quickAmount}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-4 space-y-2 rounded-xl bg-neutral-100 p-3 text-[10px]">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Estimated position units</dt>
          <dd className="tabular font-semibold">
            {quote.positionUnits.toFixed(4)} {side.toUpperCase()}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Average execution probability</dt>
          <dd className="tabular font-semibold">
            {formatProbability(quote.averageExecutionPrice)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Potential payout if correct</dt>
          <dd className="tabular font-semibold">
            {formatSol(quote.estimatedPayout, 4)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Estimated price impact</dt>
          <dd className="tabular font-semibold">
            +{quote.priceImpact.toFixed(2)} pts
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Estimated Solana fee</dt>
          <dd className="tabular font-semibold">
            ≈ {formatSol((state.feeLamports ?? 5000) / 1_000_000_000, 6)}
          </dd>
        </div>
      </dl>

      {quote.priceImpact >= 5 && amountSol > 0 && (
        <p
          className="mt-3 rounded-lg border border-ink bg-neutral-100 px-3 py-2 text-[10px] font-semibold"
          role="alert"
        >
          High price impact: this deposit materially changes the sample pool
          probability.
        </p>
      )}

      {validationError && (
        <p
          id={`amount-error-${market.id}`}
          className="mt-3 text-[10px] font-medium text-neutral-600"
          role="status"
        >
          {validationError}
        </p>
      )}

      <button
        type="button"
        data-testid="review-transaction"
        disabled={Boolean(validationError) || isPending}
        onClick={() => {
          reset()
          setIsReviewOpen(true)
        }}
        className="mt-4 h-11 w-full rounded-full bg-ink px-4 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        Review {side.toUpperCase()} position
      </button>

      <p className="mt-3 text-center text-[9px] leading-4 text-neutral-500">
        Your wallet will show the exact Devnet instruction. Never approve a
        transaction you do not understand.
      </p>

      {isReviewOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-end bg-black/35 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-heading"
            className="w-full max-w-md rounded-t-[1.5rem] border border-neutral-300 bg-paper p-5 shadow-panel sm:rounded-[1.5rem]"
          >
            {state.status === "success" && state.signature ? (
              <div aria-live="polite" className="text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-full bg-ink text-xl text-white">
                  ✓
                </div>
                <p className="eyebrow mt-4">Confirmed on Devnet</p>
                <h4 id="review-heading" className="mt-1 text-xl font-semibold">
                  Position recorded
                </h4>
                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Your browser portfolio was updated after Solana confirmed the
                  transaction.
                </p>
                <a
                  href={
                    state.explorerUrl ??
                    getExplorerTransactionUrl(state.signature)
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block rounded-full border border-ink px-4 py-2 text-xs font-bold hover:bg-ink hover:text-white"
                >
                  View transaction ↗
                </a>
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="mt-3 block w-full py-2 text-xs font-semibold text-neutral-500 hover:text-ink"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Transaction review</p>
                    <h4
                      id="review-heading"
                      className="mt-1 text-xl font-semibold"
                    >
                      Buy {side.toUpperCase()}
                    </h4>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsReviewOpen(false)}
                    className="grid size-8 place-items-center rounded-full border border-neutral-300 hover:border-ink"
                    aria-label="Close transaction review"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-3 text-sm font-semibold leading-5">
                  {market.question}
                </p>
                <dl className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white px-3.5 text-xs">
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-neutral-500">You deposit</dt>
                    <dd className="tabular font-semibold">
                      {formatSol(amountSol, 4)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-neutral-500">Outcome</dt>
                    <dd className="font-semibold">{side.toUpperCase()}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-neutral-500">Estimated payout</dt>
                    <dd className="tabular font-semibold">
                      {formatSol(quote.estimatedPayout, 4)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-neutral-500">Network</dt>
                    <dd className="font-semibold">Solana Devnet</dd>
                  </div>
                </dl>

                {state.status === "error" && state.error && (
                  <div
                    className="mt-3 rounded-xl border border-neutral-400 bg-neutral-100 p-3 text-xs leading-5"
                    role="alert"
                    aria-live="assertive"
                  >
                    <p className="font-bold">Transaction failed</p>
                    <p className="mt-1 text-neutral-600">
                      {state.error.message}
                    </p>
                  </div>
                )}

                {isPending && (
                  <div
                    className="mt-4 flex items-center gap-3 rounded-xl bg-neutral-100 p-3 text-xs font-semibold"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className="soft-pulse size-2 rounded-full bg-ink"
                      aria-hidden="true"
                    />
                    {loadingLabel[state.status] ?? "Processing transaction…"}
                  </div>
                )}

                <button
                  type="button"
                  data-testid="confirm-transaction"
                  onClick={() => void submit()}
                  disabled={isPending || Boolean(validationError)}
                  className="mt-4 h-11 w-full rounded-full bg-ink px-4 text-xs font-bold text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500"
                >
                  {isPending
                    ? (loadingLabel[state.status] ?? "Processing…")
                    : state.status === "error"
                      ? "Try again"
                      : "Confirm in wallet"}
                </button>
                <p className="mt-3 text-center text-[9px] text-neutral-500">
                  Experimental prototype · Devnet SOL has no intended monetary
                  value
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
