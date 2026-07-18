import { Buffer } from "buffer"

export const LAMPORTS_PER_SOL_BIGINT = 1_000_000_000n
export const U64_MAX = 18_446_744_073_709_551_615n

export type U64Input = bigint | number | string

export function toU64(value: U64Input, label = "value"): bigint {
  let parsed: bigint

  if (typeof value === "bigint") {
    parsed = value
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`${label} must be a safe integer.`)
    }
    parsed = BigInt(value)
  } else {
    const normalized = value.trim()
    if (!/^\d+$/.test(normalized)) {
      throw new TypeError(`${label} must be an unsigned integer.`)
    }
    parsed = BigInt(normalized)
  }

  if (parsed < 0n || parsed > U64_MAX) {
    throw new RangeError(`${label} must fit in an unsigned 64-bit integer.`)
  }

  return parsed
}

export function u64ToBuffer(value: U64Input, label?: string): Buffer {
  const parsed = toU64(value, label)
  const bytes = Buffer.alloc(8)
  bytes.writeBigUInt64LE(parsed)
  return bytes
}

/**
 * Converts a human-readable SOL amount to integer lamports without floating-point
 * arithmetic. Number inputs are normalized to at most nine decimal places; string
 * inputs are preferred for values coming from form fields.
 */
export function solToLamports(value: string | number): bigint {
  const normalized =
    typeof value === "number"
      ? Number.isFinite(value)
        ? value.toFixed(9).replace(/\.?0+$/, "")
        : ""
      : value.trim()

  const match = /^(\d+)(?:\.(\d{0,9}))?$/.exec(normalized)
  if (!match) {
    throw new TypeError(
      "Enter a valid SOL amount with no more than 9 decimal places.",
    )
  }

  const wholeDigits = match[1]
  if (!wholeDigits) {
    throw new TypeError("Enter a valid SOL amount.")
  }

  const whole = BigInt(wholeDigits)
  const fractional = BigInt((match[2] ?? "").padEnd(9, "0") || "0")
  const lamports = whole * LAMPORTS_PER_SOL_BIGINT + fractional

  if (lamports > U64_MAX) {
    throw new RangeError("The SOL amount is too large.")
  }

  return lamports
}

export function formatLamports(
  lamports: bigint | number,
  maximumFractionDigits = 4,
): string {
  const value = typeof lamports === "bigint" ? lamports : BigInt(lamports)
  const isNegative = value < 0n
  const absolute = isNegative ? -value : value
  const whole = absolute / LAMPORTS_PER_SOL_BIGINT
  const fraction = (absolute % LAMPORTS_PER_SOL_BIGINT)
    .toString()
    .padStart(9, "0")
    .slice(0, Math.max(0, Math.min(9, maximumFractionDigits)))
    .replace(/0+$/, "")

  return `${isNegative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`
}

/**
 * Stable FNV-1a u64 fallback for demo market slugs. Production/indexed markets
 * should persist an explicit numeric onchainMarketId and pass that value instead.
 */
export function marketIdToU64(value: U64Input): bigint {
  if (typeof value !== "string" || /^\d+$/.test(value.trim())) {
    return toU64(value, "market ID")
  }

  const bytes = Buffer.from(value.trim().toLowerCase(), "utf8")
  let hash = 14_695_981_039_346_656_037n
  const prime = 1_099_511_628_211n

  for (const byte of bytes) {
    hash ^= BigInt(byte)
    hash = BigInt.asUintN(64, hash * prime)
  }

  return hash
}
