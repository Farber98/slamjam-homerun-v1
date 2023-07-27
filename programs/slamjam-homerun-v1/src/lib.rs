use anchor_lang::prelude::*;
use anchor_lang::system_program;
mod constants;
mod contexts;
mod errors;
mod state;
use crate::contexts::*;
declare_id!("7rxVoKkHEj63EVcKi4gC3utmgs1D4chGP7HzQneMuyKV");

// TODO: Feature flags for tests and maybe for adm wall.
#[program]
pub mod slamjam_homerun_v1 {

    use super::*;
    use crate::constants::*;
    use crate::errors::Errors;

    // TODO: make this only admin
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Initialize round and sets admin
        let round = &mut ctx.accounts.round;
        round.initialized = true;
        round.admin = ctx.accounts.initializer.key();
        Ok(())
    }

    pub fn play(ctx: Context<Play>) -> Result<()> {
        let round = &mut ctx.accounts.round;

        // Game must be running.
        require!(!round.paused, Errors::GamePaused);

        let timestamp = Clock::get()?
            .unix_timestamp
            .checked_add(ROUND_TIME_IN_SECONDS)
            .unwrap();

        // If round has no deadline, deadline must be set.
        if round.deadline == 0 {
            // Sets deadline = current timestap + HOUR
            round.deadline = timestamp;
        }

        // If timestamp > round.deadline, it's claiming phase.
        require!(round.deadline >= timestamp, Errors::PlayInClaimingPhase);

        // Creates context for transfer CPI.
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: round.to_account_info(),
            },
        );

        // Transfers SOL from player to pool
        system_program::transfer(cpi_context, FEE)?;

        // Send 90% to pool.
        let pool_amount = FEE - COMMISION;
        round.pool = round.pool.checked_add(pool_amount).unwrap();

        // Send 10% to commision.
        round.commision = round.commision.checked_add(COMMISION).unwrap();

        Ok(())
    }

    pub fn score(ctx: Context<Score>, score: u16) -> Result<()> {
        let round = &mut ctx.accounts.round;

        // If game paused
        require!(!round.paused, Errors::GamePaused);

        // If there's no round
        require!(round.deadline != 0, Errors::ScoreWithoutRound);

        let timestamp = Clock::get()?.unix_timestamp;

        // If timestamp > round.deadline, it's claiming phase.
        require!(round.deadline >= timestamp, Errors::ScoreInClaimingPhase);

        // If it's a new highest score, update score and winner.
        if score > round.score {
            round.score = score;
            round.winner = ctx.accounts.player.key();
        }

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        let player = ctx.accounts.player.to_account_info();

        // A round must be running to be able to claim.
        require!(round.deadline > 0, Errors::ClaimWithoutRound);

        // Pool must have something to be able to claim.
        require!(round.pool != 0, Errors::PoolEmpty); // TODO: check when can happen

        let timestamp = Clock::get()?.unix_timestamp;

        // If timestamp > round.deadline, it's playing phase.
        require!(round.deadline <= timestamp, Errors::ClaimInPlayingPhase);

        // Checking that only winner can claim inside grace period
        // If we are inside grace period ( timestamp <= 2 * round.deadline )
        if timestamp <= round.deadline.checked_add(ROUND_TIME_IN_SECONDS).unwrap() {
            // Only the winner can claim
            require_keys_eq!(player.key(), round.winner, Errors::NotWinnerInGracePeriod);
        }

        // Anyone can claim after grace period (timestamp > 2 * round.deadline)

        // Prepare amount to transfer from PDA's pool.
        let transfer_amount = round.pool;
        round.pool = 0;

        // Reduce PDA balance
        **round.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;

        // Add player balance
        **ctx
            .accounts
            .player
            .to_account_info()
            .try_borrow_mut_lamports()? += transfer_amount;

        // Set deadline to zero so next play() caller sets new deadline.
        round.deadline = 0;

        Ok(())
    }

    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        // Admins will be able to pause game to prevent a new round from starting.
        let round = &mut ctx.accounts.round;

        // Check caller is admin.
        require_eq!(round.admin, ctx.accounts.admin.key(), Errors::NotAdmin);

        // Game must be running
        require!(!round.paused, Errors::GamePaused);

        round.paused = true;

        Ok(())
    }

    pub fn resume(ctx: Context<Resume>) -> Result<()> {
        // Admins will be able to resume game to make a new round start again when calling play.

        let round = &mut ctx.accounts.round;

        // Check caller is admin.
        require_eq!(round.admin, ctx.accounts.admin.key(), Errors::NotAdmin);

        // Game must be paused
        require!(round.paused, Errors::GameNotPaused);

        round.paused = false;

        Ok(())
    }

    pub fn profit(ctx: Context<Kill>) -> Result<()> {
        // Admins will be able to take profit from PDA.

        let round = &mut ctx.accounts.round;

        // Check caller is admin.
        require_eq!(round.admin, ctx.accounts.admin.key(), Errors::NotAdmin);

        // Check there is something to take profit
        require!(round.commision != 0, Errors::ProfitEmpty);

        // Prepare amount to transfer from PDA's commision.
        let transfer_amount = round.commision;
        round.commision = 0;

        // Reduce PDA balance
        **round.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;

        // Add admin balance
        **ctx
            .accounts
            .admin
            .to_account_info()
            .try_borrow_mut_lamports()? += transfer_amount;

        Ok(())
    }

    pub fn kill(ctx: Context<Kill>) -> Result<()> {
        // Admins will be able to close PDA to recover rent and commision.
        // This will kill v1 program.
        let round = &ctx.accounts.round;

        // Check caller is admin.
        require_eq!(round.admin, ctx.accounts.admin.key(), Errors::NotAdmin);

        // Game must be ended
        require!(round.paused, Errors::KillBeforePausing);

        // Pool must be empty
        require!(round.pool == 0, Errors::KillWithPool);

        Ok(())
    }
}
