use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use crate::constants::{
    CLAIM_SEED, MARKET_SEED, NO_POSITION_SEED, PROTOCOL_SEED, VAULT_SEED, YES_POSITION_SEED,
};
use crate::errors::ClimateMarketError;
use crate::state::{
    ClaimRecord, Market, MarketVault, Position, PositionSide, ProtocolConfig, ResolutionDecision,
};

declare_id!("EkcwkAzNUCGRcKCA5WJc7GCtUXooubkm3ktesBWQXPBt");

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = authority,
        space = ProtocolConfig::SPACE,
        seeds = [PROTOCOL_SEED],
        bump
    )]
    pub protocol: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

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

#[program]
pub mod climate_market {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        resolver: Pubkey,
    ) -> Result<()> {
        instructions::initialize_protocol::handler(ctx, resolver)
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        question_hash: [u8; 32],
        close_timestamp: i64,
        resolution_timestamp: i64,
    ) -> Result<()> {
        instructions::create_market::handler(
            ctx,
            market_id,
            question_hash,
            close_timestamp,
            resolution_timestamp,
        )
    }

    pub fn fund_market(
        ctx: Context<FundMarket>,
        yes_amount: u64,
        no_amount: u64,
    ) -> Result<()> {
        instructions::fund_market::handler(ctx, yes_amount, no_amount)
    }

    pub fn buy_yes(ctx: Context<BuyPosition>, amount: u64) -> Result<()> {
        instructions::buy_position::handler(ctx, amount, PositionSide::Yes)
    }

    pub fn buy_no(ctx: Context<BuyPosition>, amount: u64) -> Result<()> {
        instructions::buy_position::handler(ctx, amount, PositionSide::No)
    }

    pub fn close_market(ctx: Context<CloseMarket>) -> Result<()> {
        instructions::close_market::handler(ctx)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        decision: ResolutionDecision,
    ) -> Result<()> {
        instructions::resolve_market::handler(ctx, decision)
    }

    pub fn claim_winnings(ctx: Context<SettlePosition>) -> Result<()> {
        instructions::settle::claim_winnings(ctx)
    }

    pub fn refund_cancelled(ctx: Context<SettlePosition>) -> Result<()> {
        instructions::settle::refund_cancelled(ctx)
    }
}
