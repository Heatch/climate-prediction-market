use anchor_lang::prelude::*;

use crate::errors::ClimateMarketError;
use crate::events::MarketResolved;
use crate::state::{MarketOutcome, MarketStatus, ResolutionDecision};
use crate::ResolveMarket;

pub fn handler(ctx: Context<ResolveMarket>, decision: ResolutionDecision) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        ctx.accounts.market.status == MarketStatus::Closed,
        ClimateMarketError::MarketNotClosed
    );
    require!(
        now >= ctx.accounts.market.resolution_timestamp,
        ClimateMarketError::ResolutionTooEarly
    );

    let cancelled = match decision {
        ResolutionDecision::Yes => {
            require!(
                ctx.accounts.market.total_yes_amount > 0,
                ClimateMarketError::NoWinningLiquidity
            );
            ctx.accounts.market.status = MarketStatus::Resolved;
            ctx.accounts.market.outcome = MarketOutcome::Yes;
            false
        }
        ResolutionDecision::No => {
            require!(
                ctx.accounts.market.total_no_amount > 0,
                ClimateMarketError::NoWinningLiquidity
            );
            ctx.accounts.market.status = MarketStatus::Resolved;
            ctx.accounts.market.outcome = MarketOutcome::No;
            false
        }
        ResolutionDecision::Cancelled => {
            ctx.accounts.market.status = MarketStatus::Cancelled;
            ctx.accounts.market.outcome = MarketOutcome::Unresolved;
            true
        }
    };
    ctx.accounts.market.resolved_at = now;

    emit!(MarketResolved {
        market: ctx.accounts.market.key(),
        outcome: ctx.accounts.market.outcome,
        cancelled,
        resolver: ctx.accounts.resolver.key(),
        resolved_at: now,
    });
    Ok(())
}
