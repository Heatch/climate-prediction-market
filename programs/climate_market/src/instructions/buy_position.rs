use anchor_lang::prelude::*;

use crate::constants::{
    MARKET_SEED, NO_POSITION_SEED, PROTOCOL_SEED, VAULT_SEED, YES_POSITION_SEED,
};
use crate::errors::ClimateMarketError;
use crate::events::PositionPurchased;
use crate::instructions::common::{
    add_position_amount, assert_open_for_deposit, checked_pool_add, deposit_native_sol,
    initialize_or_validate_position,
};
use crate::state::{Market, MarketVault, Position, PositionSide, ProtocolConfig};

#[derive(Accounts)]
pub struct BuyPosition<'info> {
    #[account(seeds = [PROTOCOL_SEED], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [MARKET_SEED, &market.market_id.to_le_bytes()],
        bump = market.bump,
        constraint = market.protocol == protocol.key() @ ClimateMarketError::InvalidMarket
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
        payer = buyer,
        space = Position::SPACE,
        seeds = [YES_POSITION_SEED, market.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub yes_position: Account<'info, Position>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = Position::SPACE,
        seeds = [NO_POSITION_SEED, market.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub no_position: Account<'info, Position>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BuyPosition>, amount: u64, side: PositionSide) -> Result<()> {
    require!(amount > 0, ClimateMarketError::ZeroAmount);
    assert_open_for_deposit(&ctx.accounts.market, Clock::get()?.unix_timestamp)?;

    let market_key = ctx.accounts.market.key();
    let buyer_key = ctx.accounts.buyer.key();
    initialize_or_validate_position(
        &mut ctx.accounts.yes_position,
        market_key,
        buyer_key,
        PositionSide::Yes,
        ctx.bumps.yes_position,
    )?;
    initialize_or_validate_position(
        &mut ctx.accounts.no_position,
        market_key,
        buyer_key,
        PositionSide::No,
        ctx.bumps.no_position,
    )?;

    deposit_native_sol(
        &ctx.accounts.buyer,
        &ctx.accounts.vault,
        &ctx.accounts.system_program,
        amount,
    )?;

    let position_amount = match side {
        PositionSide::Yes => {
            add_position_amount(&mut ctx.accounts.yes_position, amount)?;
            checked_pool_add(&mut ctx.accounts.market, amount, 0)?;
            ctx.accounts.yes_position.amount
        }
        PositionSide::No => {
            add_position_amount(&mut ctx.accounts.no_position, amount)?;
            checked_pool_add(&mut ctx.accounts.market, 0, amount)?;
            ctx.accounts.no_position.amount
        }
    };

    emit!(PositionPurchased {
        market: market_key,
        buyer: buyer_key,
        side,
        amount,
        position_amount,
        total_pool_amount: ctx.accounts.market.total_pool_amount,
    });
    Ok(())
}

