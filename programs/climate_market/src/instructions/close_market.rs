use anchor_lang::prelude::*;

use crate::errors::ClimateMarketError;
use crate::events::MarketClosed;
use crate::state::MarketStatus;
use crate::CloseMarket;

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
