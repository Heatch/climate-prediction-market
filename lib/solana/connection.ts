import { Connection, type Commitment } from "@solana/web3.js"

import { SOLANA_COMMITMENT, SOLANA_RPC_URL } from "./config"

/** Creates an isolated Devnet connection suitable for server utilities or tests. */
export function createSolanaConnection(
  endpoint = SOLANA_RPC_URL,
  commitment: Commitment = SOLANA_COMMITMENT,
): Connection {
  return new Connection(endpoint, {
    commitment,
    confirmTransactionInitialTimeout: 60_000,
  })
}
