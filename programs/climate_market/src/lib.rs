use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::{PositionSide, ResolutionDecision};

declare_id!("8THvFM9mEZEyzcxgnYU18BS4GNDJqK1Xixkjnuc5yted");

#[program]
pub mod climate_market {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        resolver: Pubkey,
    ) -> Result<()> {
        instructions::initialize_protocol::handler(ctx, resolver)
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        question_hash: [u8; 32],
        close_timestamp: i64,
        resolution_timestamp: i64,
    ) -> Result<()> {
        instructions::create_market::handler(
            ctx,
            market_id,
            question_hash,
            close_timestamp,
            resolution_timestamp,
        )
    }

    pub fn fund_market(
        ctx: Context<FundMarket>,
        yes_amount: u64,
        no_amount: u64,
    ) -> Result<()> {
        instructions::fund_market::handler(ctx, yes_amount, no_amount)
    }

    pub fn buy_yes(ctx: Context<BuyPosition>, amount: u64) -> Result<()> {
        instructions::buy_position::handler(ctx, amount, PositionSide::Yes)
    }

    pub fn buy_no(ctx: Context<BuyPosition>, amount: u64) -> Result<()> {
        instructions::buy_position::handler(ctx, amount, PositionSide::No)
    }

    pub fn close_market(ctx: Context<CloseMarket>) -> Result<()> {
        instructions::close_market::handler(ctx)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        decision: ResolutionDecision,
    ) -> Result<()> {
        instructions::resolve_market::handler(ctx, decision)
    }

    pub fn claim_winnings(ctx: Context<SettlePosition>) -> Result<()> {
        instructions::settle::claim_winnings(ctx)
    }

    pub fn refund_cancelled(ctx: Context<SettlePosition>) -> Result<()> {
        instructions::settle::refund_cancelled(ctx)
    }
}
