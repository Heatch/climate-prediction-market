import { clusterApiUrl, PublicKey, type Commitment } from "@solana/web3.js"

export const SOLANA_NETWORK = "devnet" as const
export const SOLANA_COMMITMENT: Commitment = "confirmed"
export const DEFAULT_SOLANA_RPC_URL = clusterApiUrl(SOLANA_NETWORK)

const requestedNetwork =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK?.trim().toLowerCase()
const requestedRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim()
const requestedProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID?.trim()

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function parseProgramId(value: string | undefined): PublicKey | null {
  if (!value) return null

  try {
    return new PublicKey(value)
  } catch {
    return null
  }
}

export const SOLANA_RPC_URL =
  requestedRpcUrl && isHttpUrl(requestedRpcUrl)
    ? requestedRpcUrl
    : DEFAULT_SOLANA_RPC_URL

export const SOLANA_PROGRAM_ID = parseProgramId(requestedProgramId)

export const SOLANA_CONFIG_WARNING = (() => {
  if (requestedNetwork && requestedNetwork !== SOLANA_NETWORK) {
    return `Only Solana Devnet is supported by this prototype; received ${requestedNetwork}.`
  }

  if (requestedRpcUrl && !isHttpUrl(requestedRpcUrl)) {
    return "NEXT_PUBLIC_SOLANA_RPC_URL must be a valid HTTP(S) URL."
  }

  if (requestedProgramId && !SOLANA_PROGRAM_ID) {
    return "NEXT_PUBLIC_PROGRAM_ID is not a valid Solana public key."
  }

  return null
})()

export function requireProgramId(
  programId: PublicKey | null = SOLANA_PROGRAM_ID,
): PublicKey {
  if (!programId) {
    throw new Error(
      "The climate market program is not configured. Set NEXT_PUBLIC_PROGRAM_ID to the deployed Devnet program address.",
    )
  }

  return programId
}

export function getExplorerTransactionUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${SOLANA_NETWORK}`
}

export function getExplorerAddressUrl(address: PublicKey | string): string {
  const value = address instanceof PublicKey ? address.toBase58() : address
  return `https://explorer.solana.com/address/${encodeURIComponent(value)}?cluster=${SOLANA_NETWORK}`
}
