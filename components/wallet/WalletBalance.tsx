"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useSolanaWallet } from "@/components/providers/SolanaProvider"
import { formatLamports } from "@/lib/solana/encoding"
import { SOLANA_COMMITMENT } from "@/lib/solana/config"

export interface WalletBalanceProps {
  className?: string
  showRefresh?: boolean
  maximumFractionDigits?: number
}

type BalanceStatus = "idle" | "loading" | "ready" | "error"

export function WalletBalance({
  className = "",
  showRefresh = false,
  maximumFractionDigits = 4,
}: WalletBalanceProps) {
  const { connection, publicKey, connected } = useSolanaWallet()
  const [balanceLamports, setBalanceLamports] = useState<bigint | null>(null)
  const [status, setStatus] = useState<BalanceStatus>("idle")
  const requestIdRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setBalanceLamports(null)
      setStatus("idle")
      return
    }

    const requestId = ++requestIdRef.current
    setStatus("loading")

    try {
      const nextBalance = await connection.getBalance(
        publicKey,
        SOLANA_COMMITMENT,
      )
      if (requestId === requestIdRef.current) {
        setBalanceLamports(BigInt(nextBalance))
        setStatus("ready")
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setStatus("error")
      }
    }
  }, [connection, publicKey])

  useEffect(() => {
    if (!publicKey) {
      requestIdRef.current += 1
      setBalanceLamports(null)
      setStatus("idle")
      return
    }

    void refresh()

    const subscriptionId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        setBalanceLamports(BigInt(accountInfo.lamports))
        setStatus("ready")
      },
      SOLANA_COMMITMENT,
    )

    return () => {
      requestIdRef.current += 1
      void connection.removeAccountChangeListener(subscriptionId)
    }
  }, [connection, publicKey, refresh])

  if (!connected || !publicKey) {
    return (
      <span className={className} aria-live="polite">
        Wallet not connected
      </span>
    )
  }

  const balanceLabel = (() => {
    if (status === "loading" && balanceLamports === null)
      return "Loading balance…"
    if (status === "error" && balanceLamports === null)
      return "Balance unavailable"
    if (balanceLamports === null) return "— SOL"
    return `${formatLamports(balanceLamports, maximumFractionDigits)} devnet SOL`
  })()

  return (
    <span className={className} aria-live="polite">
      <span>{balanceLabel}</span>
      {showRefresh ? (
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={status === "loading"}
          aria-label="Refresh Devnet wallet balance"
        >
          Refresh
        </button>
      ) : null}
    </span>
  )
}

export default WalletBalance
