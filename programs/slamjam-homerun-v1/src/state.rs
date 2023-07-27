use anchor_lang::prelude::*;

#[account]
pub struct Round {
    // Winner of the round
    pub initialized: bool, // 1

    // Pauses round
    pub paused: bool, // 1

    // Admin of the round
    pub admin: Pubkey, // 32

    // Winner of the round
    pub winner: Pubkey, // 32

    // Highest score
    pub score: u16, // 2

    // Play until deadline. Winner claims until 2 * deadline (grace period).
    // After grace period, anyone can claim.
    pub deadline: i64, // 8

    // Pool amount
    pub pool: u64,

    // Commision amount
    pub commision: u64,
}
