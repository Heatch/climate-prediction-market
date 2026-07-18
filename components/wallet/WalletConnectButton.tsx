"use client"

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from "react"
import { WalletReadyState } from "@solana/wallet-adapter-base"

import { useSolanaWallet } from "@/components/providers/SolanaProvider"
import { getExplorerAddressUrl } from "@/lib/solana/config"

export type WalletConnectButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export function WalletConnectButton({
  className = "",
  disabled,
  onClick,
  children,
  ...props
}: WalletConnectButtonProps) {
  const {
    wallets,
    publicKey,
    connected,
    connecting,
    disconnecting,
    error,
    connect,
    disconnect,
  } = useSolanaWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const address = publicKey?.toBase58() ?? null
  const label = (() => {
    if (connecting) return "Connecting…"
    if (disconnecting) return "Disconnecting…"
    if (connected && address) return shortenAddress(address)
    return "Connect wallet"
  })()

  const openModal = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented) setIsOpen(true)
  }

  const chooseWallet = async (
    name: string,
    readyState: WalletReadyState,
    url: string,
  ) => {
    if (
      readyState === WalletReadyState.NotDetected ||
      readyState === WalletReadyState.Unsupported
    ) {
      window.open(url, "_blank", "noopener,noreferrer")
      return
    }

    try {
      await connect(name)
      setIsOpen(false)
    } catch {
      // The provider exposes a user-safe wallet error inside the modal.
    }
  }

  return (
    <>
      <button
        {...props}
        type={props.type ?? "button"}
        className={`climate-wallet-button ${className}`.trim()}
        disabled={disabled || connecting || disconnecting}
        onClick={openModal}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {children ?? label}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/35 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-heading"
            className="w-full max-w-sm rounded-3xl border border-neutral-300 bg-white p-5 text-neutral-950 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                  Solana Devnet
                </p>
                <h2
                  id="wallet-modal-heading"
                  className="mt-1 text-xl font-semibold"
                >
                  {connected ? "Wallet connected" : "Connect a wallet"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-9 place-items-center rounded-full border border-neutral-300 text-lg hover:border-neutral-950"
                aria-label="Close wallet dialog"
              >
                ×
              </button>
            </div>

            {connected && address ? (
              <div className="mt-5">
                <p className="rounded-xl bg-neutral-100 px-3 py-3 font-mono text-xs">
                  {address}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-neutral-300 px-3 py-2 text-xs font-bold hover:border-neutral-950"
                    onClick={() => {
                      void navigator.clipboard.writeText(address).then(() => {
                        setCopied(true)
                        window.setTimeout(() => setCopied(false), 1_500)
                      })
                    }}
                  >
                    {copied ? "Copied" : "Copy address"}
                  </button>
                  <a
                    href={getExplorerAddressUrl(address)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-neutral-300 px-3 py-2 text-center text-xs font-bold hover:border-neutral-950"
                  >
                    Explorer ↗
                  </a>
                </div>
                <button
                  type="button"
                  disabled={disconnecting}
                  className="mt-2 w-full rounded-full bg-neutral-950 px-3 py-2.5 text-xs font-bold text-white disabled:bg-neutral-400"
                  onClick={() => {
                    void disconnect()
                      .then(() => setIsOpen(false))
                      .catch(() => undefined)
                  }}
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect wallet"}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {wallets.map((wallet) => {
                  const available =
                    wallet.readyState === WalletReadyState.Installed ||
                    wallet.readyState === WalletReadyState.Loadable

                  return (
                    <button
                      key={wallet.name}
                      type="button"
                      disabled={connecting}
                      onClick={() =>
                        void chooseWallet(
                          wallet.name,
                          wallet.readyState,
                          wallet.url,
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-neutral-300 px-3.5 py-3 text-left transition hover:border-neutral-950 disabled:opacity-60"
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="grid size-8 place-items-center rounded-full bg-neutral-950 text-xs font-bold text-white"
                          aria-hidden="true"
                        >
                          {wallet.name.slice(0, 1)}
                        </span>
                        <span className="text-sm font-semibold">
                          {wallet.name}
                        </span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        {available
                          ? connecting
                            ? "Waiting…"
                            : "Connect"
                          : "Install ↗"}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {error ? (
              <p
                className="mt-3 rounded-xl bg-neutral-100 p-3 text-xs leading-5"
                role="alert"
              >
                {error.message}
              </p>
            ) : null}

            <p className="mt-4 text-[10px] leading-4 text-neutral-500">
              This prototype uses Devnet only. Never share your seed phrase or
              approve a transaction you do not understand.
            </p>
          </section>
        </div>
      ) : null}
    </>
  )
}

export default WalletConnectButton
