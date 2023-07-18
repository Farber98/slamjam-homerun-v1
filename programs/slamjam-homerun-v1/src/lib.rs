use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

declare_id!("7rxVoKkHEj63EVcKi4gC3utmgs1D4chGP7HzQneMuyKV");
const FEE: u64 = 1 * LAMPORTS_PER_SOL;

#[program]
pub mod slamjam_homerun_v1 {

    use super::*;
    
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
         // If round was created in this transaction, deadline must be set.
        let round = &mut ctx.accounts.round;
        round.initialized = true;
        Ok(())
    } 

    pub fn play(ctx: Context<Play>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        
        let timestamp = Clock::get()?.unix_timestamp.checked_add(3600).unwrap();

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
        
        round.pool += FEE;

        Ok(())
    }

}

#[account]
pub struct Round {
    // Winner of the round
    initialized: bool, // 1

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
    PlayInClaimingPhase,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed, 
        seeds = [b"round"],
        bump,
        payer = initializer, 
        space = 8 + 1 + 32 + 2 + 8 + 8,
        constraint = !round.initialized
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