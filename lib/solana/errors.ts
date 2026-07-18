export type MarketClientErrorCode =
  | "configuration"
  | "wallet_not_connected"
  | "wallet_rejected"
  | "invalid_amount"
  | "insufficient_balance"
  | "market_not_open"
  | "market_closed"
  | "duplicate_submission"
  | "simulation_failed"
  | "transaction_expired"
  | "program_error"
  | "rpc_error"
  | "unknown"

export interface MarketProgramClientErrorOptions {
  cause?: unknown
  logs?: readonly string[]
  programErrorCode?: number
}

export class MarketProgramClientError extends Error {
  readonly code: MarketClientErrorCode
  readonly logs: readonly string[]
  readonly programErrorCode?: number

  constructor(
    code: MarketClientErrorCode,
    message: string,
    options: MarketProgramClientErrorOptions = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    )
    this.name = "MarketProgramClientError"
    this.code = code
    this.logs = options.logs ?? []
    this.programErrorCode = options.programErrorCode
  }
}

/** Custom error numbers emitted by the Anchor climate_market program. */
export const PROGRAM_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  6000: "The resolver address is invalid.",
  6001: "The market question hash is invalid.",
  6002: "The market close time is invalid.",
  6003: "The resolution time must be at or after the market close time.",
  6004: "Only the protocol authority can perform this action.",
  6005: "Only the configured resolver can resolve this market.",
  6006: "The amount must be greater than zero.",
  6007: "At least one funding amount must be greater than zero.",
  6008: "This market is no longer open for trading.",
  6009: "This market has reached its trading deadline.",
  6010: "Trading is still open for this market.",
  6011: "This market must be closed before it can be resolved.",
  6012: "This market cannot be resolved before its resolution time.",
  6013: "The winning side has no liquidity to distribute.",
  6014: "This market has not been resolved.",
  6015: "This market was not cancelled, so a refund is unavailable.",
  6016: "The selected position did not win this market.",
  6017: "There is no position balance available to refund.",
  6018: "This payout or refund has already been claimed.",
  6019: "The supplied position account is invalid.",
  6020: "The supplied market vault is invalid.",
  6021: "The supplied market account is invalid.",
  6022: "The supplied claim record is invalid.",
  6023: "The wallet has insufficient funds.",
  6024: "The market vault has insufficient funds for this payout.",
  6025: "The requested calculation would overflow.",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error

  if (isRecord(error) && typeof error.message === "string") {
    return error.message
  }

  return "An unexpected Solana transaction error occurred."
}

function getErrorName(error: unknown): string | null {
  if (error instanceof Error) return error.name
  if (isRecord(error) && typeof error.name === "string") return error.name
  return null
}

export function extractProgramLogs(error: unknown): readonly string[] {
  if (!isRecord(error)) return []

  const directLogs = error.logs
  if (Array.isArray(directLogs)) {
    return directLogs.filter(
      (entry): entry is string => typeof entry === "string",
    )
  }

  const data = error.data
  if (isRecord(data) && Array.isArray(data.logs)) {
    return data.logs.filter(
      (entry): entry is string => typeof entry === "string",
    )
  }

  return []
}

function extractAnchorCode(error: unknown): number | null {
  if (!isRecord(error)) return null

  const anchorError = error.error
  if (!isRecord(anchorError)) return null

  const errorCode = anchorError.errorCode
  if (!isRecord(errorCode)) return null

  return typeof errorCode.number === "number" ? errorCode.number : null
}

export function extractCustomProgramErrorCode(error: unknown): number | null {
  const anchorCode = extractAnchorCode(error)
  if (anchorCode !== null) return anchorCode

  const message = getErrorMessage(error)
  const hexMatch = /custom program error:\s*0x([\da-f]+)/i.exec(message)
  if (hexMatch?.[1]) return Number.parseInt(hexMatch[1], 16)

  const decimalMatch = /Error Number:\s*(\d+)/i.exec(message)
  if (decimalMatch?.[1]) return Number.parseInt(decimalMatch[1], 10)

  for (const log of extractProgramLogs(error)) {
    const logHexMatch = /custom program error:\s*0x([\da-f]+)/i.exec(log)
    if (logHexMatch?.[1]) return Number.parseInt(logHexMatch[1], 16)

    const logDecimalMatch = /Error Number:\s*(\d+)/i.exec(log)
    if (logDecimalMatch?.[1]) return Number.parseInt(logDecimalMatch[1], 10)
  }

  return null
}

export function toMarketProgramError(error: unknown): MarketProgramClientError {
  if (error instanceof MarketProgramClientError) return error

  const message = getErrorMessage(error)
  const normalized = message.toLowerCase()
  const errorName = getErrorName(error)?.toLowerCase() ?? ""
  const logs = extractProgramLogs(error)
  const programErrorCode = extractCustomProgramErrorCode(error)

  if (
    errorName.includes("walletnotconnected") ||
    normalized.includes("wallet not connected")
  ) {
    return new MarketProgramClientError(
      "wallet_not_connected",
      "Connect a Solana wallet before submitting a transaction.",
      { cause: error, logs },
    )
  }

  if (
    errorName.includes("walletsigntransaction") ||
    normalized.includes("user rejected") ||
    normalized.includes("user declined") ||
    normalized.includes("request rejected")
  ) {
    return new MarketProgramClientError(
      "wallet_rejected",
      "The transaction was cancelled in the wallet.",
      { cause: error, logs },
    )
  }

  if (
    normalized.includes("insufficient funds") ||
    normalized.includes("insufficient lamports") ||
    normalized.includes("attempt to debit")
  ) {
    return new MarketProgramClientError(
      "insufficient_balance",
      "The wallet does not have enough Devnet SOL for this transaction and its network fee.",
      { cause: error, logs },
    )
  }

  if (
    normalized.includes("blockhash not found") ||
    normalized.includes("block height exceeded") ||
    errorName.includes("transactionexpired")
  ) {
    return new MarketProgramClientError(
      "transaction_expired",
      "The transaction expired before confirmation. Please try again.",
      { cause: error, logs },
    )
  }

  if (programErrorCode !== null) {
    return new MarketProgramClientError(
      "program_error",
      PROGRAM_ERROR_MESSAGES[programErrorCode] ??
        `The climate market program rejected the transaction (error ${programErrorCode}).`,
      { cause: error, logs, programErrorCode },
    )
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("429") ||
    normalized.includes("rpc")
  ) {
    return new MarketProgramClientError(
      "rpc_error",
      "The Solana Devnet RPC is unavailable or rate-limited. Please try again shortly.",
      { cause: error, logs },
    )
  }

  return new MarketProgramClientError("unknown", message, {
    cause: error,
    logs,
  })
}
