use anchor_lang::prelude::*;

use crate::errors::ClimateMarketError;
use crate::events::MarketFunded;
use crate::instructions::common::{
    add_position_amount, assert_open_for_deposit, checked_pool_add, deposit_native_sol,
    initialize_or_validate_position,
};
use crate::state::PositionSide;
use crate::FundMarket;

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
