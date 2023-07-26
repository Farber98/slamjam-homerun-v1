import * as anchor from "@project-serum/anchor"
import { assert, expect } from "chai"
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";
import { BN } from "bn.js";
import { setTimeout } from "timers/promises";


export function SecondRound(program: anchor.Program<SlamjamHomerunV1>, roundPDA: anchor.web3.PublicKey, provider: anchor.AnchorProvider,
    player1: anchor.web3.Keypair, player2: anchor.web3.Keypair, FEE: number, COMMISION: number, ROUND_TIME_IN_SECONDS: number) {


    describe("Live: Second Round", () => {
        let roundDeadlineBN: anchor.BN;
        const FeeToBN = new BN(FEE)
        const CommisionToBN = new BN(COMMISION)
        const FeeMinusCommisionToBN = FeeToBN.sub(CommisionToBN)

        it("player 2 should be able to play setting deadline after game resumed", async () => {
            let round = await program.account.round.fetch(roundPDA);
            const player2BalanceBefore = await program.provider.connection.getBalance(player2.publicKey);
            const roundPoolBefore = round.pool
            const roundBalanceBefore = await program.provider.connection.getBalance(roundPDA);

            // Assert deadline was zero before calling first time.
            expect(round.deadline.toNumber()).to.be.equal(0)

            let currentTimestamp = new Date()
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

            // Assert deadline lower limit.
            roundDeadlineBN = round.deadline
            const deadlineToDate = new Date(roundDeadlineBN.toNumber() * 1000)
            expect(deadlineToDate).to.be.gte(currentTimestamp)

            // Assert deadline upper limit.
            currentTimestamp = new Date()
            currentTimestamp = new Date(currentTimestamp.setSeconds(currentTimestamp.getSeconds() + ROUND_TIME_IN_SECONDS))
            expect(deadlineToDate).to.be.lt(currentTimestamp)

            // Assert player balance gets subtracted.
            const player2BalanceAfter = await program.provider.connection.getBalance(player2.publicKey);
            expect(player2BalanceAfter).to.be.equal(player2BalanceBefore - FEE)

            // Assert round balance is added
            const roundBalanceAfterFirstPlay = await program.provider.connection.getBalance(roundPDA);
            expect(roundBalanceAfterFirstPlay).to.be.equal(roundBalanceBefore + FEE)

            // Assert pool is added
            const roundPoolAfter = round.pool
            expect(roundPoolAfter.toString()).to.be.equal(roundPoolBefore.add(FeeMinusCommisionToBN).toString())
        })

        it("anyone shouldn't be able to pause game", async () => {
            try {
                await program.methods
                    .pause()
                    .accounts({
                        round: roundPDA,
                        admin: player2.publicKey
                    })
                    .signers([player2])
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'NotAdmin');
            }
        })

        it("anyone shouldn't be able to kill", async () => {
            try {
                await program.methods
                    .kill()
                    .accounts({
                        round: roundPDA,
                        admin: player2.publicKey
                    })
                    .signers([player2])
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'NotAdmin');
            }
        })

        it("admin shouldn't be able to kill if game is not paused", async () => {
            try {
                await program.methods
                    .kill()
                    .accounts({
                        round: roundPDA,
                    })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'KillBeforePausing');
            }
        })

        it("admin should be able to pause game when game is not paused", async () => {
            let round = await program.account.round.fetch(roundPDA);
            expect(round.paused).to.be.false

            await program.methods
                .pause()
                .accounts({
                    round: roundPDA,
                })
                .rpc()

            round = await program.account.round.fetch(roundPDA);
            expect(round.paused).to.be.true
        })

        it("anyone shouldn't be able to pause game when game is paused", async () => {
            try {
                await program.methods
                    .pause()
                    .accounts({
                        round: roundPDA,
                    })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'GamePaused');
            }
        })

        it("admin shouldn't be able to kill when pool is not empty", async () => {
            try {
                await program.methods
                    .kill()
                    .accounts({
                        round: roundPDA,
                    })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'KillWithPool');
            }
        })

        it("anyone should be able to claim after grace period", async () => {
            // waits deadline is reached.
            await setTimeout(2 * (ROUND_TIME_IN_SECONDS + 1) * 1000)

            let round = await program.account.round.fetch(roundPDA);
            const player1BalanceBefore = new BN(await program.provider.connection.getBalance(player1.publicKey));
            const roundPoolBefore = round.pool
            const roundBalanceBefore = new BN(await program.provider.connection.getBalance(roundPDA));
            const FeeToBN = new BN(FEE)

            // Assert pool has previous player fee
            expect(round.deadline.toNumber()).not.to.be.equal(0);

            await program.methods
                .claim()
                .accounts({
                    round: roundPDA,
                    player: player1.publicKey,
                })
                .signers([player1])
                .rpc()

            round = await program.account.round.fetch(roundPDA);
            const roundPoolAfter = round.pool

            // Assert pool balance is subtracted, pool and deadline set to zero.
            const roundBalanceAfter = new BN(await program.provider.connection.getBalance(roundPDA));
            expect(roundBalanceAfter.toString()).to.be.equal(roundBalanceBefore.sub(roundPoolBefore).toString())
            expect(round.deadline.toNumber()).to.be.equal(0);
            expect(roundPoolAfter.toNumber()).to.be.equal(0);

            // Assert player balance gets addded.
            const player1BalanceAfter = new BN(await program.provider.connection.getBalance(player1.publicKey));
            expect(player1BalanceAfter.toString()).to.be.equal(player1BalanceBefore.add(roundPoolBefore).toString())
        })

        it("anyone shouldn't be able to start another round when game paused", async () => {
            try {
                await program.methods
                    .play()
                    .accounts({ round: roundPDA })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'GamePaused');
            }
        })

        it("admin should be able to kill when game is paused and pool is empty", async () => {
            const balanceBefore = await program.provider.connection.getBalance(provider.wallet.publicKey);
            let round = await program.account.round.fetch(roundPDA);
            let commision = round.commision

            await program.methods
                .kill()
                .accounts({
                    round: roundPDA
                })
                .rpc()

            const balanceAfter = await program.provider.connection.getBalance(provider.wallet.publicKey);;
            expect(balanceAfter).to.be.gte(balanceBefore + commision.toNumber())
        })

        it("shouldn't exist a round after calling kill", async () => {
            try {
                await program.account.round.fetch(roundPDA);
            } catch (error) {
                assert.strictEqual(error.message, 'Account does not exist or has no data H6kqNVWXv1pTxSTn3dEtZ52nZpAHTAi95hS84owEeaaZ');
            }
        })

    })
}
