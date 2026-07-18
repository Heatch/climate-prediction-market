use anchor_lang::prelude::*;

use crate::errors::ClimateMarketError;
use crate::events::ProtocolInitialized;
use crate::InitializeProtocol;

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
