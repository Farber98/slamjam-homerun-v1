import * as anchor from "@project-serum/anchor"
import { assert, expect } from "chai"
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";


export function Initialization(program: anchor.Program<SlamjamHomerunV1>, roundPDA: anchor.web3.PublicKey, provider: anchor.AnchorProvider) {
    describe("Initialization", () => {

        it("Should create round when calling Initialize", async () => {
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
}
