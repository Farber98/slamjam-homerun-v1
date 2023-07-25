import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { assert, expect } from "chai"
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";
import * as web3 from '@solana/web3.js'
import { BN } from "bn.js";
import { setTimeout } from "timers/promises";


export function FirstRound(program: anchor.Program<SlamjamHomerunV1>, roundPDA: anchor.web3.PublicKey, provider: anchor.AnchorProvider,
    player1: anchor.web3.Keypair, player2: anchor.web3.Keypair, FEE: number, COMMISION: number, ROUND_TIME_IN_SECONDS: number) {



    describe("Live: First Round", () => {
        let roundDeadlineBN: anchor.BN;
        let roundBalanceAfterFirstPlay: number;
        const player1Score = 5
        const player2Score = player1Score + 10
        const FeeToBN = new BN(FEE)
        const CommisionToBN = new BN(COMMISION)
        const FeeMinusCommisionToBN = FeeToBN.sub(CommisionToBN)

        it("Shouldn't be able to score before starting round", async () => {
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
                assert.strictEqual(error.error.errorCode.code, 'ScoreWithoutRound');
            }
        })

        it("Shouldn't be able (anyone) to profit", async () => {
            try {
                await program.methods
                    .profit()
                    .accounts({
                        round: roundPDA,
                        admin: player1.publicKey
                    })
                    .signers([player1])
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'NotAdmin');
            }
        })

        it("Shouldn't be able (admin) to profit if there's no commision", async () => {
            try {
                await program.methods
                    .profit()
                    .accounts({
                        round: roundPDA,
                    })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'ProfitEmpty');
            }
        })

        it("Shouldn't be able to claim before starting round", async () => {
            try {
                await program.methods
                    .claim()
                    .accounts({
                        round: roundPDA,
                    })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'ClaimWithoutRound');
            }
        })

        it("Shouldn't be able to resume resumed game", async () => {
            try {
                await program.methods
                    .resume()
                    .accounts({
                        round: roundPDA,
                    })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'GameNotPaused');
            }
        })

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
            const roundPoolAfter = round.pool
            expect(roundPoolAfter.toString()).to.be.equal(roundPoolBefore.add(FeeMinusCommisionToBN).toString())
        })

        it("Should play (second) gracefully", async () => {
            let round = await program.account.round.fetch(roundPDA);
            const player2BalanceBefore = await program.provider.connection.getBalance(player2.publicKey);
            const roundPoolBefore = round.pool
            const roundBalanceBefore = await program.provider.connection.getBalance(roundPDA);

            // Assert pool has previous player fee
            expect(roundPoolBefore.toString()).to.be.equal(FeeMinusCommisionToBN.toString())
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
            expect(roundPoolAfter.toString()).to.be.equal(roundPoolBefore.add(FeeMinusCommisionToBN).toString())
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
                assert.strictEqual(error.error.errorCode.code, 'ClaimInPlayingPhase');
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
            // waits deadline is reached.
            await setTimeout(ROUND_TIME_IN_SECONDS * 1000 / 2)
            try {
                await program.methods
                    .claim()
                    .accounts({
                        round: roundPDA,
                        player: player1.publicKey,
                    })
                    .signers([player1])
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'NotWinnerInGracePeriod');
            }
        })

        it("Should be able to claim if winner (player 2) inside grace period", async () => {
            // waits deadline is reached.
            await setTimeout(ROUND_TIME_IN_SECONDS * 1000 / 2)

            let round = await program.account.round.fetch(roundPDA);
            const player2BalanceBefore = new BN(await program.provider.connection.getBalance(player2.publicKey));
            const roundPoolBefore = round.pool
            const roundBalanceBefore = new BN(await program.provider.connection.getBalance(roundPDA));

            // Assert pool has previous player fee
            expect(round.deadline.toNumber()).not.to.be.equal(0);

            await program.methods
                .claim()
                .accounts({
                    round: roundPDA,
                    player: player2.publicKey,
                })
                .signers([player2])
                .rpc()

            round = await program.account.round.fetch(roundPDA);
            const roundPoolAfter = round.pool

            // Assert pool balance is subtracted, pool and deadline set to zero.
            const roundBalanceAfter = new BN(await program.provider.connection.getBalance(roundPDA));
            expect(roundBalanceAfter.toString()).to.be.equal(roundBalanceBefore.sub(roundPoolBefore).toString())
            expect(round.deadline.toNumber()).to.be.equal(0);
            expect(roundPoolAfter.toNumber()).to.be.equal(0);

            // Assert player balance gets addded.
            const player2BalanceAfter = new BN(await program.provider.connection.getBalance(player2.publicKey));
            expect(player2BalanceAfter.toString()).to.be.equal(player2BalanceBefore.add(roundPoolBefore).toString())
        })

        it("Should be able (admin) to pause game", async () => {
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

        it("Shouldn't be able to start another round after game paused", async () => {
            try {
                await program.methods
                    .play()
                    .accounts({ round: roundPDA })
                    .rpc()
            } catch (error) {
                assert.strictEqual(error.error.errorCode.code, 'GamePaused');
            }
        })

        it("Shouldn't be able (anyone) to resume game", async () => {
            try {
                await program.methods
                    .resume()
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

        it("Should be able (admin) to resume game", async () => {
            let round = await program.account.round.fetch(roundPDA);
            expect(round.paused).to.be.true

            await program.methods
                .resume()
                .accounts({
                    round: roundPDA,
                })
                .rpc()

            round = await program.account.round.fetch(roundPDA);
            expect(round.paused).to.be.false
        })
    })
}
