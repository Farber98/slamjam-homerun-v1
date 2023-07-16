use anchor_lang::prelude::*;

declare_id!("7rxVoKkHEj63EVcKi4gC3utmgs1D4chGP7HzQneMuyKV");

#[program]
pub mod slamjam_homerun_v1 {
    use super::*;
    
    pub fn play(ctx: Context<Play>) -> Result<()> {
        msg!("Play called");
        
        // If round was created in this transaction, deadline must be set.
        let round = &mut ctx.accounts.round;
        if round.deadline == 0 {
            round.deadline = Clock::get()?.unix_timestamp.checked_add(3600).unwrap();
        }

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
    deadline: i64, // 8
}

#[derive(Accounts)]
pub struct Play<'info> {
    #[account(
        init_if_needed, 
        seeds = [b"round"],
        bump,
        payer = player, 
        space = 8 + 32 + 2 + 8
    )]
    pub round: Account<'info, Round>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}