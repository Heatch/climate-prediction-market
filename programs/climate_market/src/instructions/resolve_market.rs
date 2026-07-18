use anchor_lang::prelude::*;

use crate::constants::{MARKET_SEED, PROTOCOL_SEED};
use crate::errors::ClimateMarketError;
use crate::events::MarketResolved;
use crate::state::{
    Market, MarketOutcome, MarketStatus, ProtocolConfig, ResolutionDecision,
};

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol.bump,
        constraint = protocol.resolver == resolver.key() @ ClimateMarketError::UnauthorizedResolver
    )]
    pub protocol: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [MARKET_SEED, &market.market_id.to_le_bytes()],
        bump = market.bump,
        constraint = market.protocol == protocol.key() @ ClimateMarketError::InvalidMarket,
        constraint = market.resolver == resolver.key() @ ClimateMarketError::UnauthorizedResolver
    )]
    pub market: Account<'info, Market>,
    pub resolver: Signer<'info>,
}

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

