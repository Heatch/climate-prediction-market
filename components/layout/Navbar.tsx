"use client"

import WalletBalance from "@/components/wallet/WalletBalance"
import WalletConnectButton from "@/components/wallet/WalletConnectButton"

interface NavbarProps {
  search: string
  onSearchChange: (value: string) => void
}

export default function Navbar({ search, onSearchChange }: NavbarProps) {
  return (
    <>
      <div className="bg-ink px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.13em] text-white sm:text-[11px]">
        Experimental prototype · Solana Devnet · Demo markets and sample climate
        data only
      </div>
      <header className="sticky top-0 z-40 border-b border-neutral-200/90 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="group flex shrink-0 items-center gap-2.5"
            aria-label="Klashi home"
          >
            <span className="grid size-9 place-items-center rounded-full bg-ink text-sm font-black text-white transition group-hover:rotate-6">
              K
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-bold leading-none tracking-[-0.02em]">
                Klashi
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                Climate markets
              </span>
            </span>
          </a>

          <div className="relative mx-auto hidden w-full max-w-xl md:block">
            <label htmlFor="market-search" className="sr-only">
              Search climate markets
            </label>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              id="market-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search region, hazard, or market"
              className="h-11 w-full rounded-full border border-neutral-300 bg-white/75 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 hover:border-neutral-400 focus:border-ink focus:ring-1 focus:ring-ink"
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden lg:block">
              <WalletBalance className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-[10px] font-semibold text-neutral-600" />
            </div>
            <WalletConnectButton />
          </div>
        </div>

        <div className="border-t border-neutral-200 px-4 py-2.5 md:hidden">
          <label htmlFor="mobile-market-search" className="sr-only">
            Search climate markets
          </label>
          <input
            id="mobile-market-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search markets"
            className="h-10 w-full rounded-full border border-neutral-300 bg-white px-4 text-sm outline-none focus:border-ink"
          />
        </div>
      </header>
    </>
  )
}
