import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const PROGRAM_ID = new PublicKey("EkcwkAzNUCGRcKCA5WJc7GCtUXooubkm3ktesBWQXPBt")
const RPC = "https://api.devnet.solana.com"
const connection = new Connection(RPC, "confirmed")

const PROTOCOL_SEED = Buffer.from("protocol")
const MARKET_SEED = Buffer.from("market")
const VAULT_SEED = Buffer.from("vault")
const YES_POSITION_SEED = Buffer.from("yes_position")
const NO_POSITION_SEED = Buffer.from("no_position")

function loadWallet() {
  const keyPath = join(homedir(), ".config", "solana", "id.json")
  const secret = JSON.parse(readFileSync(keyPath, "utf-8"))
  return Keypair.fromSecretKey(Uint8Array.from(secret))
}

function deriveProtocol() {
  return PublicKey.findProgramAddressSync([PROTOCOL_SEED], PROGRAM_ID)[0]
}

function deriveMarket(marketId) {
  const idBuf = Buffer.alloc(8)
  idBuf.writeBigUInt64LE(BigInt(marketId))
  const market = PublicKey.findProgramAddressSync(
    [MARKET_SEED, idBuf],
    PROGRAM_ID,
  )[0]
  const vault = PublicKey.findProgramAddressSync(
    [VAULT_SEED, market.toBuffer()],
    PROGRAM_ID,
  )[0]
  return { market, vault }
}

function derivePositions(marketPda, ownerPubkey) {
  const yesPosition = PublicKey.findProgramAddressSync(
    [YES_POSITION_SEED, marketPda.toBuffer(), ownerPubkey.toBuffer()],
    PROGRAM_ID,
  )[0]
  const noPosition = PublicKey.findProgramAddressSync(
    [NO_POSITION_SEED, marketPda.toBuffer(), ownerPubkey.toBuffer()],
    PROGRAM_ID,
  )[0]
  return { yesPosition, noPosition }
}

function instructionDiscriminator(name) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8)
}

function buildInitializeProtocol(protocol, authority, resolver) {
  const disc = instructionDiscriminator("initialize_protocol")
  const data = Buffer.concat([disc, resolver.toBuffer()])
  const keys = [
    { pubkey: protocol, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]
  return { programId: PROGRAM_ID, keys, data }
}

function buildCreateMarket(
  protocol,
  authority,
  market,
  vault,
  marketId,
  questionHash,
  closeTimestamp,
  resolutionTimestamp,
) {
  const disc = instructionDiscriminator("create_market")
  const marketIdBuf = Buffer.alloc(8)
  marketIdBuf.writeBigUInt64LE(BigInt(marketId))
  const hashBuf = Buffer.from(questionHash)
  const closeBuf = Buffer.alloc(8)
  closeBuf.writeBigInt64LE(BigInt(closeTimestamp))
  const resolutionBuf = Buffer.alloc(8)
  resolutionBuf.writeBigInt64LE(BigInt(resolutionTimestamp))
  const data = Buffer.concat([
    disc,
    marketIdBuf,
    hashBuf,
    closeBuf,
    resolutionBuf,
  ])
  const keys = [
    { pubkey: protocol, isSigner: false, isWritable: true },
    { pubkey: market, isSigner: false, isWritable: true },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]
  return { programId: PROGRAM_ID, keys, data }
}

function buildFundMarket(
  protocol,
  market,
  vault,
  yesPosition,
  noPosition,
  funder,
  yesAmount,
  noAmount,
) {
  const disc = instructionDiscriminator("fund_market")
  const yesBuf = Buffer.alloc(8)
  yesBuf.writeBigUInt64LE(BigInt(yesAmount))
  const noBuf = Buffer.alloc(8)
  noBuf.writeBigUInt64LE(BigInt(noAmount))
  const data = Buffer.concat([disc, yesBuf, noBuf])
  const keys = [
    { pubkey: protocol, isSigner: false, isWritable: false },
    { pubkey: market, isSigner: false, isWritable: true },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: yesPosition, isSigner: false, isWritable: true },
    { pubkey: noPosition, isSigner: false, isWritable: true },
    { pubkey: funder, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]
  return { programId: PROGRAM_ID, keys, data }
}

const marketQuestions = {
  1001: "[DEMO] Will Florida record a Category 4+ hurricane landfall before October 31, 2026?",
  1002: "[DEMO] Will California enter severe drought conditions before December 31, 2026?",
  1003: "[DEMO] Did southern Ontario rainfall exceed its June historical average in 2026?",
  1004: "[DEMO] Will Paris, Madrid, or Rome record 40\u00B0C before September 30, 2026?",
  1005: "[DEMO] Will the Jamuna River cross the stated danger level before November 30, 2026?",
  1006: "[DEMO] Will Kenya's sample maize-yield index fall below 1.8 t/ha for the 2026 season?",
  1007: "[DEMO] Will Victoria declare a Catastrophic fire-danger day before March 31, 2027?",
  1008: "[DEMO] Was Manaus dry-season rainfall below the sample threshold by May 31, 2026?",
  1009: "[DEMO] Will the sample Rotterdam water-level threshold be exceeded before August 31, 2026?",
  1010: "[DEMO] Will any Texas station record 110\u00B0F (43.3\u00B0C) before August 5, 2026?",
  1011: "[DEMO] Will Oregon record a 100,000+ acre wildfire before October 15, 2026?",
  1012: "[DEMO] Will the Argentine Pampas enter severe drought before December 31, 2026?",
  1013: "[DEMO] Will Peru declare a coastal El Ni\u00F1o before February 28, 2027?",
  1014: "[DEMO] Will Andalusia be in meteorological drought before November 30, 2026?",
  1015: "[DEMO] Will Attica record a 5,000+ hectare wildfire before August 14, 2026?",
  1016: "[DEMO] Will the western Sahel reach IPC Crisis levels before November 30, 2026?",
  1017: "[DEMO] Will the Horn of Africa see a below-average rainy season by January 31, 2027?",
  1018: "[DEMO] Will Cape Town dam levels fall below 30% before March 31, 2027?",
  1019: "[DEMO] Will Maharashtra record above-normal monsoon rainfall by September 30, 2026?",
  1020: "[DEMO] Will a typhoon make landfall on Honshu before October 31, 2026?",
  1021: "[DEMO] Will the middle Yangtze exceed its warning level before August 9, 2026?",
  1022: "[DEMO] Will a Signal No. 3+ typhoon hit Luzon before December 31, 2026?",
  1023: "[DEMO] Will a tropical cyclone cross the Queensland coast before March 31, 2027?",
  1024: "[DEMO] Will a Wellington-area station record 35\u00B0C before February 28, 2027?",
}

function hashQuestion(question) {
  return createHash("sha256").update(question).digest()
}

function futureTimestamp(daysFromNow = 30) {
  return Math.floor(Date.now() / 1000) + daysFromNow * 86400
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendTxn(tx, signer) {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [signer], {
        commitment: "confirmed",
      })
      console.log(`  Signature: ${sig}`)
      return sig
    } catch (err) {
      if (err.message && err.message.includes("429")) {
        const wait = 1000 * 2 ** attempt
        console.log(`  Rate limited, waiting ${wait / 1000}s...`)
        await sleep(wait)
        continue
      }
      throw err
    }
  }
  throw new Error("Failed after 10 retries due to rate limiting")
}

async function main() {
  const wallet = loadWallet()
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`)
  const balance = await connection.getBalance(wallet.publicKey)
  console.log(`Balance: ${balance / 1e9} SOL\n`)

  const protocolPda = deriveProtocol()
  console.log(`Protocol PDA: ${protocolPda.toBase58()}`)

  const protocolInfo = await connection.getAccountInfo(protocolPda)
  if (!protocolInfo) {
    console.log("\n--- Initializing Protocol ---")
    const ix = buildInitializeProtocol(
      protocolPda,
      wallet.publicKey,
      wallet.publicKey,
    )
    const tx = new Transaction().add(ix)
    await sendTxn(tx, wallet)
    console.log("Protocol initialized!")
  } else {
    console.log("Protocol already initialized, skipping.")
  }

  const fundingPerSide = 500_000 // 0.0005 SOL per side (light demo funding)

  for (let marketId = 1001; marketId <= 1024; marketId++) {
    const { market, vault } = deriveMarket(marketId)
    const marketInfo = await connection.getAccountInfo(market)

    if (!marketInfo) {
      const question = marketQuestions[marketId]
      const questionHash = hashQuestion(question)
      const closeTs = futureTimestamp(30)
      const resolutionTs = closeTs + 7 * 86400

      console.log(`\n--- Creating Market ${marketId} ---`)
      const createIx = buildCreateMarket(
        protocolPda,
        wallet.publicKey,
        market,
        vault,
        marketId,
        questionHash,
        closeTs,
        resolutionTs,
      )
      let tx = new Transaction().add(createIx)
      await sendTxn(tx, wallet)
      await sleep(1500)

      console.log(`--- Funding Market ${marketId} ---`)
      const { yesPosition, noPosition } = derivePositions(
        market,
        wallet.publicKey,
      )
      const fundIx = buildFundMarket(
        protocolPda,
        market,
        vault,
        yesPosition,
        noPosition,
        wallet.publicKey,
        fundingPerSide,
        fundingPerSide,
      )
      tx = new Transaction().add(fundIx)
      await sendTxn(tx, wallet)
      await sleep(1500)
    } else {
      console.log(`Market ${marketId} already exists, skipping.`)
    }
  }

  const finalBalance = await connection.getBalance(wallet.publicKey)
  console.log(`\nDone! Final balance: ${finalBalance / 1e9} SOL`)
}

main().catch(console.error)
