"use client"

import GlobeHero from "@/components/globe/GlobeHero"
import Navbar from "@/components/layout/Navbar"
import RegionalMarketDrawer from "@/components/markets/RegionalMarketDrawer"
import { GlobeLinkProvider } from "@/components/providers/GlobeLinkProvider"
import {
  MarketProvider,
  useMarkets,
} from "@/components/providers/MarketProvider"
import { PositionProvider } from "@/components/providers/PositionProvider"
import SolanaProvider from "@/components/providers/SolanaProvider"

function DashboardContent() {
  const { search, setSearch } = useMarkets()

  return (
    <div
      id="top"
      className="fixed inset-0 isolate h-[100svh] min-h-0 w-full overflow-hidden bg-[#030605] text-white"
    >
      <Navbar search={search} onSearchChange={setSearch} />
      <main id="globe-workspace" className="h-full min-h-0 overflow-hidden">
        <GlobeHero />
      </main>
      <RegionalMarketDrawer />
    </div>
  )
}

export default function Dashboard() {
  return (
    <SolanaProvider>
      <MarketProvider>
        <PositionProvider>
          <GlobeLinkProvider>
            <DashboardContent />
          </GlobeLinkProvider>
        </PositionProvider>
      </MarketProvider>
    </SolanaProvider>
  )
}
