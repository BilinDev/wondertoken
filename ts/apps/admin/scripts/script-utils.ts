// Shared helpers for the one-off admin CLI scripts in this directory.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { BN, Idl, Program, Wallet } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
);

export function expandHome(path: string): string {
  return path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
}

export function loadKeypair(path: string): Keypair {
  const file = readFileSync(expandHome(path), "utf8");
  const secret = Uint8Array.from(JSON.parse(file) as number[]);
  return Keypair.fromSecretKey(secret);
}

type Signable = Transaction | VersionedTransaction;

/** Anchor Wallet backed by a local keypair (legacy + versioned txs). */
export function keypairWallet(signer: Keypair): Wallet {
  const sign = <T extends Signable>(tx: T): T => {
    if ("partialSign" in tx) tx.partialSign(signer);
    else tx.sign([signer]);
    return tx;
  };
  return {
    publicKey: signer.publicKey,
    payer: signer,
    signTransaction: async <T extends Signable>(tx: T) => sign(tx),
    signAllTransactions: async <T extends Signable>(txs: T[]) => txs.map(sign),
  };
}

/**
 * PDAs used by the setup scripts. Seeds mirror the on-chain program
 * (rs/programs/bunkercash/src/program.rs): b"pool" and b"bunkercash_mint".
 */
export function deriveSetupPdas(programId: PublicKey) {
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    programId,
  );
  const [mintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bunkercash_mint")],
    programId,
  );
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintPda.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  );
  return { poolPda, mintPda, metadataPda };
}

export function getClusterFromRpc(
  rpcUrl: string,
): "devnet" | "testnet" | "mainnet-beta" {
  if (rpcUrl.includes("devnet")) return "devnet";
  if (rpcUrl.includes("testnet")) return "testnet";
  return "mainnet-beta";
}

export function explorerTxUrl(rpcUrl: string, sig: string): string {
  const cluster = getClusterFromRpc(rpcUrl);
  return cluster === "mainnet-beta"
    ? `https://explorer.solana.com/tx/${sig}`
    : `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;
}

interface ScriptMethodBuilder {
  accounts(accounts: Record<string, PublicKey>): { rpc(): Promise<string> };
}

/** The subset of program instructions the setup scripts call. */
export interface SetupScriptMethods {
  initialize(admin: PublicKey, price: BN): ScriptMethodBuilder;
  createBunkercashMint(): ScriptMethodBuilder;
  initMintMetadata(name: string, symbol: string, uri: string): ScriptMethodBuilder;
  updateMintMetadata(name: string, symbol: string, uri: string): ScriptMethodBuilder;
}

export function setupMethods(program: Program<Idl>): SetupScriptMethods {
  return program.methods as unknown as SetupScriptMethods;
}
