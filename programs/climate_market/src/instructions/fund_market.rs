use anchor_lang::prelude::*;

use crate::constants::{
    MARKET_SEED, NO_POSITION_SEED, PROTOCOL_SEED, VAULT_SEED, YES_POSITION_SEED,
};
use crate::errors::ClimateMarketError;
use crate::events::MarketFunded;
use crate::instructions::common::{
    add_position_amount, assert_open_for_deposit, checked_pool_add, deposit_native_sol,
    initialize_or_validate_position,
};
use crate::state::{Market, MarketVault, Position, PositionSide, ProtocolConfig};

#[derive(Accounts)]
pub struct FundMarket<'info> {
    #[account(seeds = [PROTOCOL_SEED], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [MARKET_SEED, &market.market_id.to_le_bytes()],
        bump = market.bump,
        constraint = market.protocol == protocol.key() @ ClimateMarketError::InvalidMarket,
        constraint = market.authority == funder.key() @ ClimateMarketError::UnauthorizedAuthority
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
        constraint = vault.market == market.key() @ ClimateMarketError::InvalidMarketVault,
        constraint = vault.bump == market.vault_bump @ ClimateMarketError::InvalidMarketVault
    )]
    pub vault: Account<'info, MarketVault>,
    #[account(
        init_if_needed,
        payer = funder,
        space = Position::SPACE,
        seeds = [YES_POSITION_SEED, market.key().as_ref(), funder.key().as_ref()],
        bump
    )]
    pub yes_position: Account<'info, Position>,
    #[account(
        init_if_needed,
        payer = funder,
        space = Position::SPACE,
        seeds = [NO_POSITION_SEED, market.key().as_ref(), funder.key().as_ref()],
        bump
    )]
    pub no_position: Account<'info, Position>,
    #[account(mut)]
    pub funder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FundMarket>, yes_amount: u64, no_amount: u64) -> Result<()> {
    let total_deposit = yes_amount
        .checked_add(no_amount)
        .ok_or(ClimateMarketError::MathOverflow)?;
    require!(total_deposit > 0, ClimateMarketError::ZeroFunding);
    assert_open_for_deposit(&ctx.accounts.market, Clock::get()?.unix_timestamp)?;

    let market_key = ctx.accounts.market.key();
    let funder_key = ctx.accounts.funder.key();
    initialize_or_validate_position(
        &mut ctx.accounts.yes_position,
        market_key,
        funder_key,
        PositionSide::Yes,
        ctx.bumps.yes_position,
    )?;
    initialize_or_validate_position(
        &mut ctx.accounts.no_position,
        market_key,
        funder_key,
        PositionSide::No,
        ctx.bumps.no_position,
    )?;

    deposit_native_sol(
        &ctx.accounts.funder,
        &ctx.accounts.vault,
        &ctx.accounts.system_program,
        total_deposit,
    )?;
    add_position_amount(&mut ctx.accounts.yes_position, yes_amount)?;
    add_position_amount(&mut ctx.accounts.no_position, no_amount)?;
    checked_pool_add(&mut ctx.accounts.market, yes_amount, no_amount)?;

    emit!(MarketFunded {
        market: market_key,
        funder: funder_key,
        yes_amount,
        no_amount,
        total_pool_amount: ctx.accounts.market.total_pool_amount,
    });
    Ok(())
}

