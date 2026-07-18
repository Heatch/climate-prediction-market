
use anchor_lang::prelude::*;

use crate::constants::PROTOCOL_SEED;
use crate::errors::ClimateMarketError;
use crate::events::ProtocolInitialized;
use crate::state::ProtocolConfig;

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

pub fn handler(ctx: Context<InitializeProtocol>, resolver: Pubkey) -> Result<()> {
    require!(
        resolver != Pubkey::default(),
        ClimateMarketError::InvalidResolver
    );

    let protocol = &mut ctx.accounts.protocol;
    protocol.authority = ctx.accounts.authority.key();
    protocol.resolver = resolver;
    protocol.market_count = 0;
    protocol.bump = ctx.bumps.protocol;

    emit!(ProtocolInitialized {
        protocol: protocol.key(),
        authority: protocol.authority,
        resolver,
    });
    Ok(())
}

