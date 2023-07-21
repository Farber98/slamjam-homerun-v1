use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

declare_id!("7rxVoKkHEj63EVcKi4gC3utmgs1D4chGP7HzQneMuyKV");
const FEE: u64 = 1 * LAMPORTS_PER_SOL;
const ROUND_TIME_IN_SECONDS: i64 = /* 3600 */ 4;

#[program]
pub mod slamjam_homerun_v1 {

    use super::*;
    
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Initialize round and sets admin
        let round = &mut ctx.accounts.round;
        round.initialized = true;
        round.admin = ctx.accounts.initializer.key();
        Ok(())
    } 

    pub fn play(ctx: Context<Play>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        
        let timestamp = Clock::get()?.unix_timestamp.checked_add(ROUND_TIME_IN_SECONDS).unwrap();

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
            });

        // Transfers SOL from player to pool
        system_program::transfer(cpi_context, FEE)?;
        
        round.pool = round.pool.checked_add(FEE).unwrap();

        Ok(())
    }
    
    pub fn score(ctx: Context<Score>, score: u16) -> Result<()> {
        let round = &mut ctx.accounts.round;
        
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

        let timestamp = Clock::get()?.unix_timestamp.checked_add(ROUND_TIME_IN_SECONDS).unwrap();

        // If timestamp > round.deadline, it's claiming phase.
        require!(round.deadline <= timestamp, Errors::ClaimInPlayingPhase);
        
        // Checking that only winner can claim inside grace period        
        // If we are inside grace period
        if timestamp <= round.deadline.checked_mul(2).unwrap() {
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
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += transfer_amount;
        
        // Set deadline to zero so next play() caller sets new deadline.
        round.deadline = 0;

        Ok(())
    }

    pub fn kill(ctx: Context<Kill>) -> Result<()> {
        // Admins will be able to close PDA to recover rent and fees.
        // This will end v1 program.
        require_eq!(ctx.accounts.round.winner, ctx.accounts.admin.key(), Errors::NotAdminKilling);
        Ok(())
    }

}

#[account]
pub struct Round {
    // Winner of the round
    initialized: bool, // 1

    // Admin of the round
    admin: Pubkey, // 32

    // Winner of the round
    winner: Pubkey, // 32

    // Highest score
    score: u16, // 2

    // Play until deadline. Winner claims until 2 * deadline (grace period).
    // After grace period, anyone can claim.
    deadline: i64, // 8
    
    // Pool amount
    pool: u64
}

// An enum for custom error codes
#[error_code]
pub enum Errors {
    #[msg("Round already initialized")]
    RoundAlreadyInitialized,
    #[msg("Not in playing phase")]
    PlayInClaimingPhase,
    #[msg("Not in scoring phase")]
    ScoreInClaimingPhase,
    #[msg("Not in claiming phase")]
    ClaimInPlayingPhase,
    NotWinnerInGracePeriod,
    NotAdminKilling,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed, 
        seeds = [b"round"],
        bump,
        payer = initializer, 
        space = 8 + 1 + 32 + 32 + 2 + 8 + 8,
        constraint = !round.initialized @ Errors::RoundAlreadyInitialized
    )]
    pub round: Account<'info, Round>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Play<'info> {
    #[account(
        mut, 
        seeds = [b"round"],
        bump,
    )]
    pub round: Account<'info, Round>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Score<'info> {
    #[account(
        mut, 
        seeds = [b"round"],
        bump,
    )]
    pub round: Account<'info, Round>,
    #[account()]
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        mut, 
        seeds = [b"round"],
        bump,
    )]
    pub round: Account<'info, Round>,
    #[account(mut)]
    pub player: Signer<'info>,
}


#[derive(Accounts)]
pub struct Kill<'info> {
    #[account(
        mut, 
        seeds = [b"round"],
        bump,
        close = admin,
    )]
    pub round: Account<'info, Round>,
    #[account()]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}