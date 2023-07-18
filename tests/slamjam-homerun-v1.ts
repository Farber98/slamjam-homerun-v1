import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { assert, expect } from "chai"
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";
import * as web3 from '@solana/web3.js'
import { BN } from "bn.js";
import { setTimeout } from "timers/promises";



describe("slamjam-homerun-v1", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.SlamjamHomerunV1 as Program<SlamjamHomerunV1>;

  const [roundPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("round")],
    program.programId
  )

  const player1 = anchor.web3.Keypair.generate();

  provider.connection.requestAirdrop(
    player1.publicKey,
    10 * web3.LAMPORTS_PER_SOL // 10 SOL
  )

  const FEE = 1 * web3.LAMPORTS_PER_SOL;

  describe("Test Suite", () => {

    it("Shouldn't fetch Round before calling Initialize", async () => {
      try {
        await program.account.round.fetch(roundPDA);
      } catch (error) {
        assert.strictEqual(error.message, 'Account does not exist or has no data H6kqNVWXv1pTxSTn3dEtZ52nZpAHTAi95hS84owEeaaZ');
      }
    })

    it("Should create Round when calling Initialize", async () => {
      const tx = await program.methods
        .initialize()
        .accounts({ round: roundPDA })
        .rpc()

      const round = await program.account.round.fetch(roundPDA);

      expect(round.initialized).to.be.equal(true)
      expect(round.winner.toBase58()).to.be.equal(new anchor.web3.PublicKey(0).toBase58())
      expect(round.score).to.be.equal(0)
      expect(round.deadline.toNumber()).to.be.equal(0)
      expect(round.pool.toNumber()).to.be.equal(0)
    })

    it("Shouldn't be able to call Initialize twice", async () => {
      try {
        await program.methods
          .initialize()
          .accounts({ round: roundPDA })
          .rpc()
      } catch (error) {
        assert.strictEqual(error.message, 'AnchorError caused by account: round. Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated.');
      }
    })

    it("Should play gracefully", async () => {
      let round = await program.account.round.fetch(roundPDA);
      const player1BalanceBefore = await program.provider.connection.getBalance(player1.publicKey);
      const roundPoolBefore = round.pool
      const roundBalanceBefore = await program.provider.connection.getBalance(roundPDA);

      // Assert deadline was zero before calling first time.
      expect(round.deadline.toNumber()).to.be.equal(0)

      const tx = await program.methods
        .play()
        .accounts({
          round: roundPDA,
          player: player1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([player1])
        .rpc()


      round = await program.account.round.fetch(roundPDA);

      // Assert deadline is set and approx an hour.
      const deadlineToDate = new Date(round.deadline.toNumber() * 1000)
      const currentTimestamp = new Date()
      const HOURLower = 59 * 60 * 1000
      const HOURUpper = 61 * 60 * 1000
      const currentTimestampLower = new Date(currentTimestamp.setTime(currentTimestamp.getTime() + HOURLower))
      const currentTimestampUpper = new Date(currentTimestamp.setTime(currentTimestamp.getTime() + HOURUpper))
      expect(deadlineToDate).to.be.gte(currentTimestampLower)
      expect(deadlineToDate).to.be.lte(currentTimestampUpper)

      // Assert player balance gets subtracted.
      const player1BalanceAfter = await program.provider.connection.getBalance(player1.publicKey);
      expect(player1BalanceAfter).to.be.equal(player1BalanceBefore - FEE)

      // Assert round balance is added
      const roundBalanceAfter = await program.provider.connection.getBalance(roundPDA);
      expect(roundBalanceAfter).to.be.equal(roundBalanceBefore + FEE)

      // Assert pool is added
      const FeeToBN = new BN(FEE)
      const roundPoolAfter = round.pool
      expect(roundPoolAfter.toString()).to.be.equal(roundPoolBefore.add(FeeToBN).toString())
    })

    it("Shouldn't be able to play after deadline", async () => {
      expect(true).to.be.equal(false);
    })

  })
})

