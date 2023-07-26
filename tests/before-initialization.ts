import * as anchor from "@project-serum/anchor"
import { assert, expect } from "chai"
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";

export function beforeInitialization(program: anchor.Program<SlamjamHomerunV1>, roundPDA: anchor.web3.PublicKey) {
    return describe("Before initialization", () => {

        it("shouldn't exist a round before calling initialize", async () => {
            try {
                await program.account.round.fetch(roundPDA);
            } catch (error) {
                assert.strictEqual(error.message, 'Account does not exist or has no data H6kqNVWXv1pTxSTn3dEtZ52nZpAHTAi95hS84owEeaaZ');
            }
        })

        it("anyone shouldn't be able to play before calling initialize", async () => {
            try {
                await program.methods
                    .play()
                    .accounts({ round: roundPDA })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
            }
        })

        it("anyone shouldn't be able to score before calling initialize", async () => {
            try {
                await program.methods
                    .score(1)
                    .accounts({ round: roundPDA })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
            }
        })

        it("anyone shouldn't be able to claim before calling initialize", async () => {
            try {
                await program.methods
                    .claim()
                    .accounts({ round: roundPDA })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
            }
        })

        it("anyone shouldn't be able to pause before calling initialize", async () => {
            try {
                await program.methods
                    .pause()
                    .accounts({ round: roundPDA })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
            }
        })

        it("anyone shouldn't be able to resume before calling initialize", async () => {
            try {
                await program.methods
                    .resume()
                    .accounts({ round: roundPDA })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
            }
        })

        it("anyone shouldn't be able to profit before calling initialize", async () => {
            try {
                await program.methods
                    .profit()
                    .accounts({ round: roundPDA })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'AccountNotInitialized');
            }
        })

        it("anyone shouldn't be able to kill before calling initialize", async () => {
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
}
