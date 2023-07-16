use anchor_lang::prelude::*;

declare_id!("7rxVoKkHEj63EVcKi4gC3utmgs1D4chGP7HzQneMuyKV");

#[program]
pub mod slamjam_homerun_v1 {
    use super::*;
    
    pub fn play(ctx: Context<Play>) -> Result<()> {
        msg!("Play called");
        Ok(())
    }

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