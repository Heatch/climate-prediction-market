"use client"

import { createContext, useContext, useMemo, useRef } from "react"

interface GlobeLinkValue {
  /** Ref holding the id of the market currently hovered in a list. */
  hoveredMarketIdRef: React.MutableRefObject<string | null>
  setHoveredMarketId: (id: string | null) => void
}

/**
 * Connects list surfaces (market cards) with the canvas globe without causing
 * React re-renders: hovering a card writes an id into a ref that the globe's
 * animation loop reads each frame to pulse the matching marker.
 *
 * The default is a safe no-op so cards render fine anywhere (including tests)
 * even when no provider is mounted.
 */
const GlobeLinkContext = createContext<GlobeLinkValue>({
  hoveredMarketIdRef: { current: null },
  setHoveredMarketId: () => {},
})

export function GlobeLinkProvider({ children }: { children: React.ReactNode }) {
  const hoveredMarketIdRef = useRef<string | null>(null)
  const value = useMemo<GlobeLinkValue>(
    () => ({
      hoveredMarketIdRef,
      setHoveredMarketId: (id: string | null) => {
        hoveredMarketIdRef.current = id
      },
    }),
    [],
  )

  return (
    <GlobeLinkContext.Provider value={value}>
      {children}
    </GlobeLinkContext.Provider>
  )
}

export function useGlobeLink() {
  return useContext(GlobeLinkContext)
}
