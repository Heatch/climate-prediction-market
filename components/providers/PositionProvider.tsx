"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { useSolanaWallet } from "@/components/providers/SolanaProvider"
import type { TradeSide } from "@/lib/markets/types"

export interface IndexedPosition {
  id: string
  wallet: string
  marketId: string
  marketQuestion: string
  region: string
  side: TradeSide
  amountSol: number
  estimatedPayoutSol: number
  signature: string
  status: "open" | "claimable" | "claimed" | "refundable" | "refunded"
  createdAt: string
}

type PositionContextValue = {
  positions: IndexedPosition[]
  recordPurchase: (
    position: Omit<IndexedPosition, "id" | "wallet" | "status" | "createdAt">,
  ) => void
  updatePositionStatus: (
    id: string,
    status: IndexedPosition["status"],
    signature?: string,
  ) => void
}

const PositionContext = createContext<PositionContextValue | null>(null)
const STORAGE_PREFIX = "klashi:devnet:positions:"

function parseStoredPositions(value: string | null): IndexedPosition[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is IndexedPosition =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "wallet" in item &&
        "marketId" in item &&
        "signature" in item,
    )
  } catch {
    return []
  }
}

export function PositionProvider({ children }: { children: React.ReactNode }) {
  const { publicKey } = useSolanaWallet()
  const wallet = publicKey?.toBase58() ?? null
  const [positions, setPositions] = useState<IndexedPosition[]>([])

  useEffect(() => {
    if (!wallet) {
      setPositions([])
      return
    }
    setPositions(
      parseStoredPositions(
        window.localStorage.getItem(`${STORAGE_PREFIX}${wallet}`),
      ),
    )
  }, [wallet])

  const persist = useCallback(
    (nextPositions: IndexedPosition[]) => {
      setPositions(nextPositions)
      if (wallet)
        window.localStorage.setItem(
          `${STORAGE_PREFIX}${wallet}`,
          JSON.stringify(nextPositions),
        )
    },
    [wallet],
  )

  const recordPurchase = useCallback(
    (
      position: Omit<IndexedPosition, "id" | "wallet" | "status" | "createdAt">,
    ) => {
      if (!wallet) return
      const nextPosition: IndexedPosition = {
        ...position,
        id: `${position.marketId}:${position.side}:${position.signature}`,
        wallet,
        status: "open",
        createdAt: new Date().toISOString(),
      }
      persist([
        nextPosition,
        ...positions.filter((item) => item.id !== nextPosition.id),
      ])
    },
    [persist, positions, wallet],
  )

  const updatePositionStatus = useCallback(
    (id: string, status: IndexedPosition["status"], signature?: string) => {
      persist(
        positions.map((position) =>
          position.id === id
            ? {
                ...position,
                status,
                signature: signature ?? position.signature,
              }
            : position,
        ),
      )
    },
    [persist, positions],
  )

  const value = useMemo(
    () => ({ positions, recordPurchase, updatePositionStatus }),
    [positions, recordPurchase, updatePositionStatus],
  )

  return (
    <PositionContext.Provider value={value}>
      {children}
    </PositionContext.Provider>
  )
}

export function usePositions() {
  const value = useContext(PositionContext)
  if (!value)
    throw new Error("usePositions must be used inside PositionProvider")
  return value
}
