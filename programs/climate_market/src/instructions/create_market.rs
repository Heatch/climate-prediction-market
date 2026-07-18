use anchor_lang::prelude::*;

use crate::constants::{MARKET_SEED, PROTOCOL_SEED, VAULT_SEED};
use crate::errors::ClimateMarketError;
use crate::events::MarketCreated;
use crate::state::{Market, MarketOutcome, MarketStatus, MarketVault, ProtocolConfig};

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol.bump,
        has_one = authority @ ClimateMarketError::UnauthorizedAuthority
    )]
    pub protocol: Account<'info, ProtocolConfig>,
    #[account(
        init,
        payer = authority,
        space = Market::SPACE,
        seeds = [MARKET_SEED, &market_id.to_le_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        init,
        payer = authority,
        space = MarketVault::SPACE,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, MarketVault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    market_id: u64,
    question_hash: [u8; 32],
    close_timestamp: i64,
    resolution_timestamp: i64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        question_hash != [0; 32],
        ClimateMarketError::InvalidQuestionHash
    );
    require!(
        close_timestamp > now,
        ClimateMarketError::InvalidCloseTimestamp
    );
    require!(
        resolution_timestamp >= close_timestamp,
        ClimateMarketError::InvalidResolutionTimestamp
    );

    let protocol = &mut ctx.accounts.protocol;
    let market = &mut ctx.accounts.market;
    market.protocol = protocol.key();
    market.authority = ctx.accounts.authority.key();
    market.resolver = protocol.resolver;
    market.market_id = market_id;
    market.question_hash = question_hash;
    market.close_timestamp = close_timestamp;
    market.resolution_timestamp = resolution_timestamp;
    market.status = MarketStatus::Open;
    market.outcome = MarketOutcome::Unresolved;
    market.total_yes_amount = 0;
    market.total_no_amount = 0;
    market.total_pool_amount = 0;
    market.total_paid_amount = 0;
    market.resolved_at = 0;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;

    let vault = &mut ctx.accounts.vault;
    vault.market = market.key();
    vault.bump = ctx.bumps.vault;

    protocol.market_count = protocol
        .market_count
        .checked_add(1)
        .ok_or(ClimateMarketError::MathOverflow)?;

    emit!(MarketCreated {
        market: market.key(),
        market_id,
        authority: market.authority,
        resolver: market.resolver,
        close_timestamp,
        resolution_timestamp,
    });
    Ok(())
}

