import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AnchorProvider, Program, BN, type Idl } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  deriveSetupPdas,
  keypairWallet,
  loadKeypair,
  setupMethods,
} from "./script-utils";

async function main() {
  const rpcUrl =
    process.env.RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  const signer = loadKeypair("~/.config/solana/id.json");

  const idlRaw = readFileSync(
    resolve(process.cwd(), "../rs/target/idl/bunkercash.json"),
    "utf8",
  );
  const idlJson = JSON.parse(idlRaw) as Idl & { address: string };
  const programId = new PublicKey(idlJson.address);

  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new AnchorProvider(connection, keypairWallet(signer), {
    commitment: "confirmed",
  });
  const program = new Program(idlJson, provider);

  const { poolPda, mintPda, metadataPda } = deriveSetupPdas(programId);

  console.log("Program:", programId.toBase58());
  console.log("Pool PDA:", poolPda.toBase58());
  console.log("Mint PDA:", mintPda.toBase58());
  console.log("Metadata PDA:", metadataPda.toBase58());
  console.log("Admin:", signer.publicKey.toBase58());
  console.log();

  // Step 1: Initialize pool + mint
  const poolAccount = await connection.getAccountInfo(poolPda);
  if (poolAccount) {
    console.log("Pool already initialized, skipping.");
  } else {
    console.log("Step 1: Initializing pool + mint...");
    // price = 1 USDC per token = 1_000_000 base units
    const sig = await setupMethods(program)
      .initialize(signer.publicKey, new BN(1_000_000))
      .accounts({
        pool: poolPda,
        bunkercashMint: mintPda,
        payer: signer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("  Tx:", sig);
    console.log();
  }

  // Step 2: Init metadata
  const metadataAccount = await connection.getAccountInfo(metadataPda);
  if (metadataAccount) {
    console.log("Metadata already exists, skipping.");
  } else {
    console.log("Step 2: Creating metadata...");
    const sig = await setupMethods(program)
      .initMintMetadata(
        "WonderToken",
        "WNDR",
        "https://wondercall.ai/wndr-metadata.json",
      )
      .accounts({
        pool: poolPda,
        bunkercashMint: mintPda,
        admin: signer.publicKey,
        metadata: metadataPda,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("  Tx:", sig);
    console.log();
  }

  console.log("Done! Program fully set up.");
  console.log(`Mint: ${mintPda.toBase58()}`);
  console.log(
    `Explorer: https://explorer.solana.com/address/${mintPda.toBase58()}?cluster=devnet`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
