use anchor_lang::prelude::*;

use crate::constants::{MARKET_SEED, PROTOCOL_SEED};
use crate::errors::ClimateMarketError;
use crate::events::MarketClosed;
use crate::state::{Market, MarketStatus, ProtocolConfig};

#[derive(Accounts)]
pub struct CloseMarket<'info> {
    #[account(seeds = [PROTOCOL_SEED], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [MARKET_SEED, &market.market_id.to_le_bytes()],
        bump = market.bump,
        constraint = market.protocol == protocol.key() @ ClimateMarketError::InvalidMarket
    )]
    pub market: Account<'info, Market>,
    pub closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseMarket>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        ClimateMarketError::MarketNotOpen
    );
    require!(
        now >= ctx.accounts.market.close_timestamp,
        ClimateMarketError::TradingStillOpen
    );

    ctx.accounts.market.status = MarketStatus::Closed;
    emit!(MarketClosed {
        market: ctx.accounts.market.key(),
        closed_at: now,
        closer: ctx.accounts.closer.key(),
    });
    Ok(())
}

