import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { assert, expect } from "chai"
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";

describe("slamjam-homerun-v1", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.SlamjamHomerunV1 as Program<SlamjamHomerunV1>;

  const [roundPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("round")],
    program.programId
  )

  describe("Test Suite", () => {

    it("Shouldn't fetch Round before calling play", async () => {
      try {
        await program.account.round.fetch(roundPDA);
      } catch (error) {
        assert.strictEqual(error.message, 'Account does not exist or has no data H6kqNVWXv1pTxSTn3dEtZ52nZpAHTAi95hS84owEeaaZ');
      }
    })

    it("Should create Round gracefully", async () => {
      const tx = await program.methods
        .play()
        .accounts({ round: roundPDA })
        .rpc()

      const round = await program.account.round.fetch(roundPDA)

      expect(round.deadline).to.be.equal(0)
      expect(round.score).to.be.equal(0)
      expect(round.winner.toBase58()).to.be.equal(new anchor.web3.PublicKey(0).toBase58())
    })

    it("Should be able to fetch Round after it is created", async () => {
      await program.account.round.fetch(roundPDA);
    })

  })
})

