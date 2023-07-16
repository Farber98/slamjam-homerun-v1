import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { assert, expect } from "chai"
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";

describe("slamjam-homerun-v1", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.SlamjamHomerunV1 as Program<SlamjamHomerunV1>;

  const [roundCounterPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("round-counter")],
    program.programId
  )

  describe("Test Suite", () => {

    it("Shouldn't fetch Round Counter before calling initialize", async () => {
      try {
        await program.account.roundCounter.fetch(roundCounterPDA);
      } catch (error) {
        assert.strictEqual(error.message, 'Account does not exist or has no data FBRqoYDyLR3ugaGQjmeJh9Jimxc2rtNoQ2FNdavdKuAg');
      }
    })

    it("Should initialize Round Counter gracefully", async () => {
      const tx = await program.methods
        .initialize()
        .accounts({ roundCounter: roundCounterPDA })
        .rpc()

      const roundCounter = await program.account.roundCounter.fetch(roundCounterPDA)

      expect(roundCounter.round).to.be.equal(1);
    })

    it("Shouldn't let Round Counter be initialized twice", async () => {
      try {
        const tx = await program.methods
          .initialize()
          .accounts({ roundCounter: roundCounterPDA })
          .rpc()
      } catch (error) {
        assert.strictEqual(error.message, 'failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x0');
      }

    })
  })

});
