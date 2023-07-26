import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { assert, expect } from "chai"
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";
import * as web3 from '@solana/web3.js'
import { BN } from "bn.js";
import { setTimeout } from "timers/promises";
import { beforeInitialization } from "./before-initialization";
import { Initialization } from "./initialization";
import { FirstRound } from "./first-round";
import { SecondRound } from "./second-round";



describe("slamjam-homerun-v1 test suite", () => {
  //Make test standar [who] [able|unable] to do something [given certain condition]

  // Constants and configurations:

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.SlamjamHomerunV1 as Program<SlamjamHomerunV1>;

  const [roundPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("round")],
    program.programId
  )

  const player1 = anchor.web3.Keypair.generate();
  const player2 = anchor.web3.Keypair.generate();

  provider.connection.requestAirdrop(
    player1.publicKey,
    10 * web3.LAMPORTS_PER_SOL // 10 SOL
  )

  provider.connection.requestAirdrop(
    player2.publicKey,
    10 * web3.LAMPORTS_PER_SOL // 10 SOL
  )

  const FEE = 1 * web3.LAMPORTS_PER_SOL;
  const COMMISION = FEE / 10; // 0.1 SOL
  const ROUND_TIME_IN_SECONDS = /* 3600 */ 4;

  // Test suites
  beforeInitialization(program, roundPDA)

  Initialization(program, roundPDA, provider)

  FirstRound(program, roundPDA, provider, player1, player2, FEE, COMMISION, ROUND_TIME_IN_SECONDS)

  SecondRound(program, roundPDA, provider, player1, player2, FEE, COMMISION, ROUND_TIME_IN_SECONDS)

})
