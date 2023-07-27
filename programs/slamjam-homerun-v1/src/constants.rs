use anchor_lang::prelude::constant;
use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

pub const FEE: u64 = 1 * LAMPORTS_PER_SOL; // 1 SOL
pub const COMMISION: u64 = FEE / 10; // 0.1 SOL

#[cfg(feature = "testing")]
#[constant]
pub const ROUND_TIME_IN_SECONDS: i64 = 4;

#[cfg(feature = "production")]
#[constant]
pub const ROUND_TIME_IN_SECONDS: i64 = 3600;
