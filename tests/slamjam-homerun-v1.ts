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

  const ROUND_TIME_IN_SECONDS = /* 3600 */ 4;

  describe("Before initialization", () => {

    it("Shouldn't exist a Round before calling Initialize", async () => {
      try {
        await program.account.round.fetch(roundPDA);
      } catch (error) {
        assert.strictEqual(error.message, 'Account does not exist or has no data H6kqNVWXv1pTxSTn3dEtZ52nZpAHTAi95hS84owEeaaZ');
      }
    })

    it("Shouldn't be able to play before calling Initialize", async () => {
      try {
        await program.methods
          .play()
          .accounts({ round: roundPDA })
          .rpc()
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
      }
    })

    it("Shouldn't be able to score before calling Initialize", async () => {
      try {
        await program.methods
          .score(1)
          .accounts({ round: roundPDA })
          .rpc()
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
      }
    })

    it("Shouldn't be able to claim before calling Initialize", async () => {
      try {
        await program.methods
          .claim()
          .accounts({ round: roundPDA })
          .rpc()
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
      }
    })

    it("Shouldn't be able to kill before calling Initialize", async () => {
      try {
        await program.methods
          .kill()
          .accounts({ round: roundPDA })
          .rpc()
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
      }
    })
  })

  describe("Initialization", () => {

    it("Should create Round when calling Initialize", async () => {
      await program.methods
        .initialize()
        .accounts({ round: roundPDA })
        .rpc()

      const round = await program.account.round.fetch(roundPDA);

      expect(round.initialized).to.be.equal(true)
      expect(round.admin.toBase58()).to.be.equal(provider.wallet.publicKey.toBase58())
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
        assert.strictEqual(error.error.errorCode.code, 'RoundAlreadyInitialized');
      }
    })

  })

  describe("Live", () => {
    let roundDeadlineBN: anchor.BN;
    let roundBalanceAfterFirstPlay: number;
    const player1Score = 5
    const player2Score = player1Score + 10

    it("Should play (first) gracefully setting deadline", async () => {
      let round = await program.account.round.fetch(roundPDA);
      const player1BalanceBefore = await program.provider.connection.getBalance(player1.publicKey);
      const roundPoolBefore = round.pool
      const roundBalanceBefore = await program.provider.connection.getBalance(roundPDA);

      // Assert deadline was zero before calling first time.
      expect(round.deadline.toNumber()).to.be.equal(0)

      let currentTimestamp = new Date()
      await program.methods
        .play()
        .accounts({
          round: roundPDA,
          player: player1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([player1])
        .rpc()

      round = await program.account.round.fetch(roundPDA);

      // Assert deadline lower limit.
      roundDeadlineBN = round.deadline
      const deadlineToDate = new Date(roundDeadlineBN.toNumber() * 1000)
      expect(deadlineToDate).to.be.gte(currentTimestamp)

      // Assert deadline upper limit.
      currentTimestamp = new Date()
      currentTimestamp = new Date(currentTimestamp.setSeconds(currentTimestamp.getSeconds() + ROUND_TIME_IN_SECONDS))
      expect(deadlineToDate).to.be.lt(currentTimestamp)

      // Assert player balance gets subtracted.
      const player1BalanceAfter = await program.provider.connection.getBalance(player1.publicKey);
      expect(player1BalanceAfter).to.be.equal(player1BalanceBefore - FEE)

      // Assert round balance is added
      roundBalanceAfterFirstPlay = await program.provider.connection.getBalance(roundPDA);
      expect(roundBalanceAfterFirstPlay).to.be.equal(roundBalanceBefore + FEE)

      // Assert pool is added
      const FeeToBN = new BN(FEE)
      const roundPoolAfter = round.pool
      expect(roundPoolAfter.toString()).to.be.equal(roundPoolBefore.add(FeeToBN).toString())
    })

    it("Should play (second) gracefully", async () => {
      let round = await program.account.round.fetch(roundPDA);
      const player2BalanceBefore = await program.provider.connection.getBalance(player2.publicKey);
      const roundPoolBefore = round.pool
      const roundBalanceBefore = await program.provider.connection.getBalance(roundPDA);
      const FeeToBN = new BN(FEE)

      // Assert pool has previous player fee
      expect(roundPoolBefore.toString()).to.be.equal(FeeToBN.toString())
      // Assert roundPDA has previous player fee as balance
      expect(roundBalanceBefore).to.be.equal(roundBalanceAfterFirstPlay)
      // Assert deadline is the one set in first call to play ()
      expect(round.deadline.toString()).to.be.equal(roundDeadlineBN.toString())

      await program.methods
        .play()
        .accounts({
          round: roundPDA,
          player: player2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([player2])
        .rpc()

      round = await program.account.round.fetch(roundPDA);

      // Assert player balance gets subtracted.
      const player2BalanceAfter = await program.provider.connection.getBalance(player1.publicKey);
      expect(player2BalanceAfter).to.be.equal(player2BalanceBefore - FEE)

      // Assert round balance is added
      const roundBalanceAfter = await program.provider.connection.getBalance(roundPDA);
      expect(roundBalanceAfter).to.be.equal(roundBalanceBefore + FEE)

      // Assert pool is added
      const roundPoolAfter = round.pool
      expect(roundPoolAfter.toString()).to.be.equal(roundPoolBefore.add(FeeToBN).toString())
    })

    it("Should set player 1 as winner", async () => {
      let round = await program.account.round.fetch(roundPDA);

      expect(round.winner.toBase58()).to.be.equal(new anchor.web3.PublicKey(0).toBase58())
      expect(round.score).to.be.equal(0)

      await program.methods
        .score(player1Score)
        .accounts({
          round: roundPDA,
          player: player1.publicKey
        })
        .signers([player1])
        .rpc()

      round = await program.account.round.fetch(roundPDA);

      expect(round.winner.toBase58().toString()).to.be.equal(player1.publicKey.toString())
      expect(round.score).to.be.equal(player1Score)
    })

    it("Should set player 2 as winner", async () => {
      let round = await program.account.round.fetch(roundPDA);

      expect(round.winner.toBase58().toString()).to.be.equal(player1.publicKey.toString())
      expect(round.score).to.be.equal(player1Score)

      await program.methods
        .score(player2Score)
        .accounts({
          round: roundPDA,
          player: player2.publicKey
        })
        .signers([player2])
        .rpc()

      round = await program.account.round.fetch(roundPDA);

      expect(round.winner.toBase58().toString()).to.be.equal(player2.publicKey.toString())
      expect(round.score).to.be.equal(player2Score)
    })

    it("Shouldn't be able to claim before deadline", async () => {
      try {
        await program.methods
          .claim()
          .accounts({
            round: roundPDA,
            player: player2.publicKey,
          })
          .signers([player2])
          .rpc()
      } catch (error) {
        console.log(error)
      }
    })

    it("Shouldn't be able to play after deadline", async () => {
      // waits deadline is reached.
      await setTimeout(ROUND_TIME_IN_SECONDS * 1000 / 2)

      try {
        await program.methods
          .play()
          .accounts({ round: roundPDA })
          .rpc()
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'PlayInClaimingPhase');
      }
    })

    it("Shouldn't be able to score after deadline", async () => {
      // waits deadline is reached.
      await setTimeout(ROUND_TIME_IN_SECONDS * 1000 / 2)

      try {
        await program.methods
          .score(player2Score + 10)
          .accounts({
            round: roundPDA,
            player: player1.publicKey
          })
          .signers([player1])
          .rpc()
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, 'ScoreInClaimingPhase');
      }
    })

    it("Shouldn't be able to claim if not winner inside grace period", async () => {

    })

    it("Should be able to claim if winner inside grace period", async () => {

    })

    it("Should be able to claim after grace period", async () => {

    })

  })
})

