use anchor_lang::prelude::*;

use crate::state::{MarketOutcome, PositionSide};

#[event]
pub struct ProtocolInitialized {
    pub protocol: Pubkey,
    pub authority: Pubkey,
    pub resolver: Pubkey,
}

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub market_id: u64,
    pub authority: Pubkey,
    pub resolver: Pubkey,
    pub close_timestamp: i64,
    pub resolution_timestamp: i64,
}

#[event]
pub struct MarketFunded {
    pub market: Pubkey,
    pub funder: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub total_pool_amount: u64,
}

#[event]
pub struct PositionPurchased {
    pub market: Pubkey,
    pub buyer: Pubkey,
    pub side: PositionSide,
    pub amount: u64,
    pub position_amount: u64,
    pub total_pool_amount: u64,
}

#[event]
pub struct MarketClosed {
    pub market: Pubkey,
    pub closed_at: i64,
    pub closer: Pubkey,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub outcome: MarketOutcome,
    pub cancelled: bool,
    pub resolver: Pubkey,
    pub resolved_at: i64,
}

#[event]
pub struct WinningsClaimed {
    pub market: Pubkey,
    pub claimant: Pubkey,
    pub winning_position: u64,
    pub payout: u64,
}

#[event]
pub struct RefundClaimed {
    pub market: Pubkey,
    pub claimant: Pubkey,
    pub yes_refund: u64,
    pub no_refund: u64,
    pub total_refund: u64,
}
