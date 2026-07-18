use anchor_lang::prelude::*;

#[account]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub resolver: Pubkey,
    pub market_count: u64,
    pub bump: u8,
}

impl ProtocolConfig {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1;
}

#[account]
pub struct Market {
    pub protocol: Pubkey,
    pub authority: Pubkey,
    pub resolver: Pubkey,
    pub market_id: u64,
    pub question_hash: [u8; 32],
    pub close_timestamp: i64,
    pub resolution_timestamp: i64,
    pub status: MarketStatus,
    pub outcome: MarketOutcome,
    pub total_yes_amount: u64,
    pub total_no_amount: u64,
    pub total_pool_amount: u64,
    pub total_paid_amount: u64,
    pub resolved_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Market {
    pub const SPACE: usize = 8
        + 32
        + 32
        + 32
        + 8
        + 32
        + 8
        + 8
        + 1
        + 1
        + 8
        + 8
        + 8
        + 8
        + 8
        + 1
        + 1;
}

#[account]
pub struct MarketVault {
    pub market: Pubkey,
    pub bump: u8,
}

impl MarketVault {
    pub const SPACE: usize = 8 + 32 + 1;
}

#[account]
pub struct Position {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub side: PositionSide,
    pub amount: u64,
    pub bump: u8,
}

impl Position {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 8 + 1;
}

#[account]
pub struct ClaimRecord {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub claimed: bool,
    pub kind: ClaimKind,
    pub amount: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

impl ClaimRecord {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum MarketStatus {
    Open,
    Closed,
    Resolved,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum MarketOutcome {
    Unresolved,
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ResolutionDecision {
    Yes,
    No,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PositionSide {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ClaimKind {
    Winnings,
    Refund,
}

