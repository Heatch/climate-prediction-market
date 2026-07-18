"use client"

import { useEffect, useState } from "react"

import MarketChart from "@/components/markets/MarketChart"
import PredictionForm from "@/components/trading/PredictionForm"
import RedeemPosition from "@/components/trading/RedeemPosition"
import type { ClimateMarket } from "@/lib/markets/types"
import {
  formatCompact,
  formatCountdown,
  formatDateTime,
  formatProbability,
  formatSol,
  shortenAddress,
} from "@/lib/utils/format"

interface MarketDetailsProps {
  market: ClimateMarket
  onBack: () => void
}

export default function MarketDetails({ market, onBack }: MarketDetailsProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const totalLiquidity = market.yesLiquidity + market.noLiquidity

  return (
    <article aria-labelledby="market-question" className="pb-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-[11px] font-bold transition hover:border-ink hover:bg-ink hover:text-white"
        >
          ← {market.continent}
        </button>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
            {market.dataLabel}
          </span>
          <span className="rounded-full bg-ink px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
            {market.status}
          </span>
        </div>
      </div>

      <p className="eyebrow mt-6">
        {market.region} · {market.category.replace("-", " ")}
      </p>
      <h2
        id="market-question"
        className="mt-3 text-2xl font-semibold leading-[1.15] tracking-[-0.035em] sm:text-[2rem]"
      >
        {market.question}
      </h2>
      <p className="mt-4 text-sm leading-6 text-neutral-600">
        {market.description}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-ink p-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Implied YES
          </p>
          <p className="tabular mt-2 text-3xl font-semibold">
            {formatProbability(market.yesPrice)}
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">
            Solid line · {formatSol(market.yesLiquidity)} pool
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-300 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            Implied NO
          </p>
          <p className="tabular mt-2 text-3xl font-semibold">
            {formatProbability(market.noPrice)}
          </p>
          <p className="mt-1 text-[10px] text-neutral-500">
            Dashed line · {formatSol(market.noLiquidity)} pool
          </p>
        </div>
      </div>

      <section
        className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5"
        aria-labelledby="history-heading"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Sample probability history</p>
            <h3 id="history-heading" className="mt-1 text-sm font-semibold">
              Relative pool commitments
            </h3>
          </div>
          <div
            className="flex gap-3 text-[10px] font-semibold text-neutral-500"
            aria-label="Chart legend"
          >
            <span>
              <span className="mr-1 inline-block h-0.5 w-4 bg-ink align-middle" />
              YES
            </span>
            <span>
              <span className="mr-1 inline-block w-4 border-t border-dashed border-neutral-500 align-middle" />
              NO
            </span>
          </div>
        </div>
        <div className="mt-2">
          <MarketChart history={market.history} />
        </div>
        <p className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-[10px] leading-relaxed text-neutral-600">
          Fictional demo history—not observed climate data or investment
          performance. Probabilities equal each side&apos;s share of the sample
          pool.
        </p>
      </section>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
        {[
          ["Volume", `${formatCompact(market.totalVolume)} SOL`],
          ["Liquidity", formatSol(totalLiquidity)],
          ["Participants", formatCompact(market.participants)],
          ["Closes", formatCountdown(market.closeTime, now)],
        ].map(([label, value]) => (
          <div key={label} className="bg-white p-3.5">
            <dt className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
              {label}
            </dt>
            <dd className="tabular mt-1.5 text-xs font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <PredictionForm market={market} />
      <RedeemPosition market={market} />

      <section
        className="mt-7 border-t border-neutral-200 pt-6"
        aria-labelledby="resolution-heading"
      >
        <p className="eyebrow">Settlement</p>
        <h3 id="resolution-heading" className="mt-1 text-base font-semibold">
          Resolution conditions
        </h3>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {market.resolutionRules}
        </p>
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs leading-5">
          <p>
            <span className="font-semibold">Authorized resolver:</span>{" "}
            {shortenAddress(market.resolver, 6)}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Primary source:</span>{" "}
            <a
              href={market.resolutionSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-neutral-400 underline-offset-2 hover:decoration-ink"
            >
              {market.resolutionSource} ↗
            </a>
          </p>
          <p className="mt-1 text-neutral-500">
            Scheduled close: {formatDateTime(market.closeTime)}
          </p>
        </div>
      </section>

      <section
        className="mt-7 border-t border-neutral-200 pt-6"
        aria-labelledby="evidence-heading"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Research desk</p>
            <h3 id="evidence-heading" className="mt-1 text-base font-semibold">
              Supporting evidence
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-neutral-500">
            For context only
          </span>
        </div>
        <div className="mt-3 space-y-2.5">
          {market.evidence.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-neutral-200 bg-white p-3.5 transition hover:border-neutral-400"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                    {item.summary}
                  </p>
                </div>
                <span aria-hidden="true" className="text-neutral-400">
                  ↗
                </span>
              </div>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                {item.publisher} · Demo reference
              </p>
            </a>
          ))}
        </div>
      </section>

      <section
        className="mt-7 border-t border-neutral-200 pt-6"
        aria-labelledby="trades-heading"
      >
        <p className="eyebrow">Activity</p>
        <h3 id="trades-heading" className="mt-1 text-base font-semibold">
          Recent sample trades
        </h3>
        <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white px-3.5">
          {market.recentTrades.slice(0, 5).map((trade) => (
            <div
              key={trade.id}
              className="flex items-center gap-3 py-3 text-[11px]"
            >
              <span
                className={`w-10 rounded-md px-2 py-1 text-center text-[9px] font-black ${
                  trade.side === "yes"
                    ? "bg-ink text-white"
                    : "border border-neutral-300 text-neutral-600"
                }`}
              >
                {trade.side.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-neutral-500">
                {shortenAddress(trade.wallet)}
              </span>
              <span className="tabular font-semibold">
                {formatSol(trade.amountSol, 3)}
              </span>
              <span className="text-neutral-400">
                @ {formatProbability(trade.probability)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 rounded-xl bg-neutral-100 p-3 text-[10px] leading-4 text-neutral-600">
        Pooled-market MVP:{" "}
        <code className="font-semibold">
          payout = winning position × total pool ÷ winning-side pool
        </code>
        . Integer division rounds down on-chain. This prototype is not a central
        limit order book or a production financial service.
      </div>
    </article>
  )
}
