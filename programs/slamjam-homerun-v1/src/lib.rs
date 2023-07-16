use anchor_lang::prelude::*;

declare_id!("7rxVoKkHEj63EVcKi4gC3utmgs1D4chGP7HzQneMuyKV");

#[program]
pub mod slamjam_homerun_v1 {
    use super::*;
    
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Iinitializing Round Counter");
        let round_counter = &mut ctx.accounts.round_counter;
        round_counter.round = 1;
        Ok(())
    }

    pub fn play(ctx: Context<Play>) -> Result<()> {
        msg!("Play called");
        Ok(())
    }

}

#[account]
pub struct RoundCounter {
    // To point current round.
    round: u32, // 4
}

#[account]
pub struct Round {
    // Winner of the round
    winner: Pubkey, // 32

    // Highest score
    score: u16, // 2

    // Play until deadline. Winner claims until 2 * deadline (grace period).
    // After grace period, anyone can claim.
    deadline: u32, // 4
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        seeds = [b"round-counter"],
        bump,
        payer = initializer, 
        space = 8 + 4
    )]
    pub round_counter: Account<'info, RoundCounter>,
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Play<'info> {
    #[account(
        init_if_needed, 
        seeds = [b"round"],
        bump,
        payer = player, 
        space = 8 + 38
    )]
    pub round: Account<'info, Round>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}