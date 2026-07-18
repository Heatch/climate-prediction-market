import { BN, BorshInstructionCoder } from "@coral-xyz/anchor"
import { Buffer } from "buffer"
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type AccountMeta,
} from "@solana/web3.js"

import { requireProgramId, SOLANA_PROGRAM_ID } from "./config"
import { toU64, type U64Input } from "./encoding"
import { CLIMATE_MARKET_IDL } from "./idl"
import {
  deriveMarketProgramAddresses,
  type MarketProgramAddresses,
  type MarketSide,
} from "./pdas"

const instructionCoder = new BorshInstructionCoder(CLIMATE_MARKET_IDL)

export interface MarketInstructionContext {
  marketId: U64Input
  owner: PublicKey
  programId?: PublicKey | null
  addresses?: MarketProgramAddresses
}

export interface BuyInstructionInput extends MarketInstructionContext {
  side: MarketSide
  amountLamports: U64Input
}

function readonly(pubkey: PublicKey, isSigner = false): AccountMeta {
  return { pubkey, isSigner, isWritable: false }
}

function writable(pubkey: PublicKey, isSigner = false): AccountMeta {
  return { pubkey, isSigner, isWritable: true }
}

function getContext(input: MarketInstructionContext): {
  programId: PublicKey
  addresses: MarketProgramAddresses
} {
  const programId = requireProgramId(input.programId ?? SOLANA_PROGRAM_ID)
  const addresses =
    input.addresses ??
    deriveMarketProgramAddresses(programId, input.marketId, input.owner)

  return { programId, addresses }
}

function encode(name: string, args: Record<string, unknown>): Buffer {
  const data = instructionCoder.encode(name, args)
  if (!data) {
    throw new Error(`Unable to encode the ${name} Anchor instruction.`)
  }
  return data
}

export function buildBuyInstruction(
  input: BuyInstructionInput,
): TransactionInstruction {
  const { programId, addresses } = getContext(input)
  const amount = toU64(input.amountLamports, "purchase amount")

  if (amount === 0n) {
    throw new RangeError("Purchase amount must be greater than zero.")
  }

  const instructionName = input.side === "yes" ? "buyYes" : "buyNo"

  return new TransactionInstruction({
    programId,
    keys: [
      readonly(addresses.protocolConfig),
      writable(addresses.market),
      writable(addresses.vault),
      writable(addresses.yesPosition),
      writable(addresses.noPosition),
      writable(input.owner, true),
      readonly(SystemProgram.programId),
    ],
    data: encode(instructionName, { amount: new BN(amount.toString()) }),
  })
}

export function buildClaimWinningsInstruction(
  input: MarketInstructionContext,
): TransactionInstruction {
  const { programId, addresses } = getContext(input)

  return new TransactionInstruction({
    programId,
    keys: [
      readonly(addresses.protocolConfig),
      writable(addresses.market),
      writable(addresses.vault),
      readonly(addresses.yesPosition),
      readonly(addresses.noPosition),
      writable(addresses.claimRecord),
      writable(input.owner, true),
      readonly(SystemProgram.programId),
    ],
    data: encode("claimWinnings", {}),
  })
}

export function buildRefundCancelledInstruction(
  input: MarketInstructionContext,
): TransactionInstruction {
  const { programId, addresses } = getContext(input)

  return new TransactionInstruction({
    programId,
    keys: [
      readonly(addresses.protocolConfig),
      writable(addresses.market),
      writable(addresses.vault),
      readonly(addresses.yesPosition),
      readonly(addresses.noPosition),
      writable(addresses.claimRecord),
      writable(input.owner, true),
      readonly(SystemProgram.programId),
    ],
    data: encode("refundCancelled", {}),
  })
}
