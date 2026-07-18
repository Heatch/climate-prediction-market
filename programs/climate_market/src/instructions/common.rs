use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::errors::ClimateMarketError;
use crate::state::{Market, MarketStatus, MarketVault, Position, PositionSide};

pub fn assert_open_for_deposit(market: &Market, now: i64) -> Result<()> {
    require!(
        market.status == MarketStatus::Open,
        ClimateMarketError::MarketNotOpen
    );
    require!(now < market.close_timestamp, ClimateMarketError::TradingClosed);
    Ok(())
}

pub fn initialize_or_validate_position(
    position: &mut Account<Position>,
    market: Pubkey,
    owner: Pubkey,
    side: PositionSide,
    bump: u8,
) -> Result<()> {
    if position.owner == Pubkey::default() {
        position.market = market;
        position.owner = owner;
        position.side = side;
        position.amount = 0;
        position.bump = bump;
        return Ok(());
    }

    require_keys_eq!(
        position.market,
        market,
        ClimateMarketError::InvalidPosition
    );
    require_keys_eq!(position.owner, owner, ClimateMarketError::InvalidPosition);
    require!(position.side == side, ClimateMarketError::InvalidPosition);
    require!(position.bump == bump, ClimateMarketError::InvalidPosition);
    Ok(())
}

pub fn add_position_amount(position: &mut Account<Position>, amount: u64) -> Result<()> {
    position.amount = position
        .amount
        .checked_add(amount)
        .ok_or(ClimateMarketError::MathOverflow)?;
    Ok(())
}

pub fn deposit_native_sol<'info>(
    depositor: &Signer<'info>,
    vault: &Account<'info, MarketVault>,
    system_program: &Program<'info, System>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, ClimateMarketError::ZeroAmount);
    require!(
        depositor.to_account_info().lamports() >= amount,
        ClimateMarketError::InsufficientFunds
    );

    let transfer_accounts = Transfer {
        from: depositor.to_account_info(),
        to: vault.to_account_info(),
    };
    system_program::transfer(
        CpiContext::new(system_program.to_account_info(), transfer_accounts),
        amount,
    )
}

/// Moves deposited SOL out of the program-owned vault while preserving the
/// vault account's rent-exempt reserve. Only protocol deposits, tracked by the
/// market account, are ever used to determine `amount`.
pub fn withdraw_native_sol<'info>(
    vault: &Account<'info, MarketVault>,
    recipient: &Signer<'info>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, ClimateMarketError::MathOverflow);

    let vault_info = vault.to_account_info();
    let recipient_info = recipient.to_account_info();
    let rent_reserve = Rent::get()?.minimum_balance(MarketVault::SPACE);
    let vault_balance = vault_info.lamports();
    let available = vault_balance
        .checked_sub(rent_reserve)
        .ok_or(ClimateMarketError::VaultInsufficientFunds)?;
    require!(
        available >= amount,
        ClimateMarketError::VaultInsufficientFunds
    );

    let recipient_balance = recipient_info.lamports();
    let updated_vault_balance = vault_balance
        .checked_sub(amount)
        .ok_or(ClimateMarketError::MathOverflow)?;
    let updated_recipient_balance = recipient_balance
        .checked_add(amount)
        .ok_or(ClimateMarketError::MathOverflow)?;

    **vault_info.try_borrow_mut_lamports()? = updated_vault_balance;
    **recipient_info.try_borrow_mut_lamports()? = updated_recipient_balance;
    Ok(())
}

pub fn checked_pool_add(market: &mut Account<Market>, yes: u64, no: u64) -> Result<()> {
    let deposit = yes
        .checked_add(no)
        .ok_or(ClimateMarketError::MathOverflow)?;
    market.total_yes_amount = market
        .total_yes_amount
        .checked_add(yes)
        .ok_or(ClimateMarketError::MathOverflow)?;
    market.total_no_amount = market
        .total_no_amount
        .checked_add(no)
        .ok_or(ClimateMarketError::MathOverflow)?;
    market.total_pool_amount = market
        .total_pool_amount
        .checked_add(deposit)
        .ok_or(ClimateMarketError::MathOverflow)?;

    let recomputed_pool = market
        .total_yes_amount
        .checked_add(market.total_no_amount)
        .ok_or(ClimateMarketError::MathOverflow)?;
    require!(
        market.total_pool_amount == recomputed_pool,
        ClimateMarketError::MathOverflow
    );
    Ok(())
}

