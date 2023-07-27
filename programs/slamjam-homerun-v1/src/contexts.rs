use anchor_lang::prelude::*;
use crate::state::Round;
use crate::errors::Errors;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed, 
        seeds = [b"round"],
        bump,
        payer = initializer, 
        space = 8 + 1 + 1 + 32 + 32 + 2 + 8 + 8 + 8,
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
pub struct Pause<'info> {
    #[account(
        mut, 
        seeds = [b"round"],
        bump,
    )]
    pub round: Account<'info, Round>,
    #[account(mut)]
    pub admin: Signer<'info>,
}
#[derive(Accounts)]
pub struct Resume<'info> {
    #[account(
        mut, 
        seeds = [b"round"],
        bump,
    )]
    pub round: Account<'info, Round>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct Profit<'info> {
    #[account(
        mut, 
        seeds = [b"round"],
        bump,
    )]
    pub round: Account<'info, Round>,
    #[account(mut)]
    pub admin: Signer<'info>,
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
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}