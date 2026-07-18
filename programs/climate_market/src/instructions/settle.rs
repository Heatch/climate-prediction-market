use anchor_lang::prelude::*;

use crate::constants::{
    CLAIM_SEED, MARKET_SEED, NO_POSITION_SEED, PROTOCOL_SEED, VAULT_SEED,
    YES_POSITION_SEED,
};
use crate::errors::ClimateMarketError;
use crate::events::{RefundClaimed, WinningsClaimed};
use crate::instructions::common::withdraw_native_sol;
use crate::state::{
    ClaimKind, ClaimRecord, Market, MarketOutcome, MarketStatus, MarketVault, Position,
    PositionSide, ProtocolConfig,
};

#[derive(Accounts)]
pub struct SettlePosition<'info> {
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
        seeds = [YES_POSITION_SEED, market.key().as_ref(), claimant.key().as_ref()],
        bump = yes_position.bump,
        constraint = yes_position.market == market.key() @ ClimateMarketError::InvalidPosition,
        constraint = yes_position.owner == claimant.key() @ ClimateMarketError::InvalidPosition,
        constraint = yes_position.side == PositionSide::Yes @ ClimateMarketError::InvalidPosition
    )]
    pub yes_position: Account<'info, Position>,
    #[account(
        seeds = [NO_POSITION_SEED, market.key().as_ref(), claimant.key().as_ref()],
        bump = no_position.bump,
        constraint = no_position.market == market.key() @ ClimateMarketError::InvalidPosition,
        constraint = no_position.owner == claimant.key() @ ClimateMarketError::InvalidPosition,
        constraint = no_position.side == PositionSide::No @ ClimateMarketError::InvalidPosition
    )]
    pub no_position: Account<'info, Position>,
    #[account(
        init_if_needed,
        payer = claimant,
        space = ClaimRecord::SPACE,
        seeds = [CLAIM_SEED, market.key().as_ref(), claimant.key().as_ref()],
        bump
    )]
    pub claim_record: Account<'info, ClaimRecord>,
    #[account(mut)]
    pub claimant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn claim_winnings(ctx: Context<SettlePosition>) -> Result<()> {
    require!(
        ctx.accounts.market.status == MarketStatus::Resolved,
        ClimateMarketError::MarketNotResolved
    );
    initialize_or_validate_claim(
        &mut ctx.accounts.claim_record,
        ctx.accounts.market.key(),
        ctx.accounts.claimant.key(),
        ctx.bumps.claim_record,
    )?;

    let (winning_position, total_winning_pool) = match ctx.accounts.market.outcome {
        MarketOutcome::Yes => (
            ctx.accounts.yes_position.amount,
            ctx.accounts.market.total_yes_amount,
        ),
        MarketOutcome::No => (
            ctx.accounts.no_position.amount,
            ctx.accounts.market.total_no_amount,
        ),
        MarketOutcome::Unresolved => return err!(ClimateMarketError::MarketNotResolved),
    };
    require!(
        winning_position > 0,
        ClimateMarketError::LosingPosition
    );
    require!(
        total_winning_pool > 0,
        ClimateMarketError::NoWinningLiquidity
    );

    // Pooled binary settlement formula (integer division rounds down safely):
    // user_payout = user_winning_position * total_market_pool / winning_side_pool.
    // Any sub-lamport division remainder remains as harmless vault dust.
    let payout_u128 = (winning_position as u128)
        .checked_mul(ctx.accounts.market.total_pool_amount as u128)
        .ok_or(ClimateMarketError::MathOverflow)?
        .checked_div(total_winning_pool as u128)
        .ok_or(ClimateMarketError::MathOverflow)?;
    let payout = u64::try_from(payout_u128).map_err(|_| ClimateMarketError::MathOverflow)?;

    let updated_paid = ctx
        .accounts
        .market
        .total_paid_amount
        .checked_add(payout)
        .ok_or(ClimateMarketError::MathOverflow)?;
    require!(
        updated_paid <= ctx.accounts.market.total_pool_amount,
        ClimateMarketError::MathOverflow
    );

    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.claim_record.claimed = true;
    ctx.accounts.claim_record.kind = ClaimKind::Winnings;
    ctx.accounts.claim_record.amount = payout;
    ctx.accounts.claim_record.claimed_at = now;
    ctx.accounts.market.total_paid_amount = updated_paid;
    withdraw_native_sol(
        &ctx.accounts.vault,
        &ctx.accounts.claimant,
        payout,
    )?;

    emit!(WinningsClaimed {
        market: ctx.accounts.market.key(),
        claimant: ctx.accounts.claimant.key(),
        winning_position,
        payout,
    });
    Ok(())
}

pub fn refund_cancelled(ctx: Context<SettlePosition>) -> Result<()> {
    require!(
        ctx.accounts.market.status == MarketStatus::Cancelled,
        ClimateMarketError::MarketNotCancelled
    );
    initialize_or_validate_claim(
        &mut ctx.accounts.claim_record,
        ctx.accounts.market.key(),
        ctx.accounts.claimant.key(),
        ctx.bumps.claim_record,
    )?;

    let yes_refund = ctx.accounts.yes_position.amount;
    let no_refund = ctx.accounts.no_position.amount;
    let total_refund = yes_refund
        .checked_add(no_refund)
        .ok_or(ClimateMarketError::MathOverflow)?;
    require!(total_refund > 0, ClimateMarketError::NothingToRefund);

    let updated_paid = ctx
        .accounts
        .market
        .total_paid_amount
        .checked_add(total_refund)
        .ok_or(ClimateMarketError::MathOverflow)?;
    require!(
        updated_paid <= ctx.accounts.market.total_pool_amount,
        ClimateMarketError::MathOverflow
    );

    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.claim_record.claimed = true;
    ctx.accounts.claim_record.kind = ClaimKind::Refund;
    ctx.accounts.claim_record.amount = total_refund;
    ctx.accounts.claim_record.claimed_at = now;
    ctx.accounts.market.total_paid_amount = updated_paid;
    withdraw_native_sol(
        &ctx.accounts.vault,
        &ctx.accounts.claimant,
        total_refund,
    )?;

    emit!(RefundClaimed {
        market: ctx.accounts.market.key(),
        claimant: ctx.accounts.claimant.key(),
        yes_refund,
        no_refund,
        total_refund,
    });
    Ok(())
}

fn initialize_or_validate_claim(
    claim: &mut Account<ClaimRecord>,
    market: Pubkey,
    owner: Pubkey,
    bump: u8,
) -> Result<()> {
    if claim.owner == Pubkey::default() {
        claim.market = market;
        claim.owner = owner;
        claim.claimed = false;
        claim.kind = ClaimKind::Winnings;
        claim.amount = 0;
        claim.claimed_at = 0;
        claim.bump = bump;
    } else {
        require_keys_eq!(
            claim.market,
            market,
            ClimateMarketError::InvalidClaimRecord
        );
        require_keys_eq!(claim.owner, owner, ClimateMarketError::InvalidClaimRecord);
        require!(claim.bump == bump, ClimateMarketError::InvalidClaimRecord);
    }
    require!(!claim.claimed, ClimateMarketError::AlreadyClaimed);
    Ok(())
}
