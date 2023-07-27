use anchor_lang::prelude::*;

// An enum for custom error codes
#[error_code]
pub enum Errors {
    #[msg("Round already initialized")]
    RoundAlreadyInitialized,
    #[msg("Game paused")]
    GamePaused,
    #[msg("Game not paused")]
    GameNotPaused,
    #[msg("Not in playing phase")]
    PlayInClaimingPhase,
    #[msg("Not in scoring phase")]
    ScoreWithoutRound,
    #[msg("Not in scoring phase")]
    ScoreInClaimingPhase,
    #[msg("Not in claiming phase")]
    ClaimWithoutRound,
    #[msg("Not in claiming phase")]
    ClaimInPlayingPhase,
    #[msg("Game still running")]
    KillBeforePausing,
    #[msg("Pool is not empty")]
    KillWithPool,
    #[msg("Commision is empty")]
    ProfitEmpty,
    #[msg("Pool is empty")]
    PoolEmpty,
    NotWinnerInGracePeriod,
    #[msg("Only admin")]
    NotAdmin,
}
