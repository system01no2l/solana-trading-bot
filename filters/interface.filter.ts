import { LiquidityPoolKeysV4, Token, TokenAmount } from '@raydium-io/raydium-sdk';

export interface Filter {
	execute(poolKeysV4: LiquidityPoolKeysV4): Promise<FilterResult>;
}

export interface FilterResult {
	ok: boolean;
	message?: string;
}

export interface PoolFilterArgs {
	minPoolSize: TokenAmount;
	maxPoolSize: TokenAmount;
	quoteToken: Token;
}