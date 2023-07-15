use anchor_lang::prelude::*;

declare_id!("7rxVoKkHEj63EVcKi4gC3utmgs1D4chGP7HzQneMuyKV");

#[program]
pub mod slamjam_homerun_v1 {
    use super::*;
}

#[account]
pub struct RoundCounter {
    // To point current round.
    round: u32, // 4
}

#[account]
pub struct Round {
    // Who claimed the round
    claimer: Pubkey, // 32

    // Winner of the round
    winner: Pubkey, // 32

    // Highest score
    score: u16, // 2

    // Play until deadline. Winner claims until 2 * deadline (grace period).
    // After grace period, anyone can claim.
    deadline: u32, // 4
}
