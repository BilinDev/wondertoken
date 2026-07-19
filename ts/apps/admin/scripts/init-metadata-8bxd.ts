import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
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
  const keypairPath = process.argv[2] ?? "~/.config/solana/id.json";
  const signer = loadKeypair(keypairPath);

  // Use the web app's IDL (program 8BXD...)
  const idlRaw = readFileSync(
    resolve(process.cwd(), "apps/web/lib/bunkercash.fixed.idl.json"),
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
  console.log("Pool:", poolPda.toBase58());
  console.log("Mint:", mintPda.toBase58());
  console.log("Metadata:", metadataPda.toBase58());
  console.log("Signer:", signer.publicKey.toBase58());

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

  console.log("Done! Signature:", sig);
  console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
