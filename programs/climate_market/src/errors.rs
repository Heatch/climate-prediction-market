use anchor_lang::prelude::*;

#[error_code]
pub enum ClimateMarketError {
    #[msg("The resolver cannot be the default public key.")]
    InvalidResolver,
    #[msg("The market question hash cannot be all zeroes.")]
    InvalidQuestionHash,
    #[msg("The market close timestamp must be in the future.")]
    InvalidCloseTimestamp,
    #[msg("The resolution timestamp must be at or after the close timestamp.")]
    InvalidResolutionTimestamp,
    #[msg("Only the protocol authority may perform this action.")]
    UnauthorizedAuthority,
    #[msg("Only the configured resolver may resolve this market.")]
    UnauthorizedResolver,
    #[msg("The deposit amount must be greater than zero.")]
    ZeroAmount,
    #[msg("At least one side must receive funding.")]
    ZeroFunding,
    #[msg("This market is not open for trading.")]
    MarketNotOpen,
    #[msg("Trading has closed for this market.")]
    TradingClosed,
    #[msg("Trading is still open for this market.")]
    TradingStillOpen,
    #[msg("This market has not been closed.")]
    MarketNotClosed,
    #[msg("The market cannot be resolved before its resolution timestamp.")]
    ResolutionTooEarly,
    #[msg("A YES/NO resolution requires liquidity on the winning side; cancel instead.")]
    NoWinningLiquidity,
    #[msg("This market is not resolved.")]
    MarketNotResolved,
    #[msg("This market is not cancelled.")]
    MarketNotCancelled,
    #[msg("The claimant has no winning position.")]
    LosingPosition,
    #[msg("The claimant has no position to refund.")]
    NothingToRefund,
    #[msg("This market has already been claimed or refunded by the user.")]
    AlreadyClaimed,
    #[msg("A supplied position account does not belong to the expected user or market.")]
    InvalidPosition,
    #[msg("The supplied market vault is invalid.")]
    InvalidMarketVault,
    #[msg("The supplied market account is invalid.")]
    InvalidMarket,
    #[msg("The supplied claim record is invalid.")]
    InvalidClaimRecord,
    #[msg("The signer does not have enough lamports for this deposit.")]
    InsufficientFunds,
    #[msg("The market vault does not contain enough deposited lamports.")]
    VaultInsufficientFunds,
    #[msg("An arithmetic operation overflowed or underflowed.")]
    MathOverflow,
}

