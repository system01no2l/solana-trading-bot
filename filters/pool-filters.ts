import { Connection } from '@solana/web3.js';
import { LiquidityPoolKeysV4, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import { getMetadataAccountDataSerializer } from '@metaplex-foundation/mpl-token-metadata';
import { BurnFilter } from './burn.filter';
import { MutableFilter } from './mutable.filter';
import { RenouncedFreezeFilter } from './renounced.filter';
import { PoolSizeFilter } from './pool-size.filter';
import { RiskLevelFilter } from './risk-level.filter';

import { Filter, FilterResult,  PoolFilterArgs } from './interface.filter';

import {
	CHECK_IF_BURNED,
	CHECK_IF_FREEZABLE,
	CHECK_IF_MINT_IS_RENOUNCED,
	CHECK_IF_MUTABLE,
	CHECK_IF_SOCIALS,
	CHECK_IF_RUG,
	logger
} from '../helpers';

export class PoolFilters {
	private readonly filters: Filter[] = [];

	constructor(
		readonly connection: Connection,
		readonly args: PoolFilterArgs,
	) {
		if (CHECK_IF_BURNED) {
			this.filters.push(new BurnFilter(connection));
		}

		if (CHECK_IF_MINT_IS_RENOUNCED || CHECK_IF_FREEZABLE) {
			this.filters.push(new RenouncedFreezeFilter(connection, CHECK_IF_MINT_IS_RENOUNCED, CHECK_IF_FREEZABLE));
		}

		if (CHECK_IF_MUTABLE || CHECK_IF_SOCIALS) {
			this.filters.push(new MutableFilter(connection, getMetadataAccountDataSerializer(), CHECK_IF_MUTABLE, CHECK_IF_SOCIALS));
		}

		if (!args.minPoolSize.isZero() || !args.maxPoolSize.isZero()) {
			this.filters.push(new PoolSizeFilter(connection, args.quoteToken, args.minPoolSize, args.maxPoolSize));
		}

		// check risk level
		if (CHECK_IF_RUG) {
			this.filters.push(new RiskLevelFilter(connection));
		}
	}

	public async execute(poolKeys: LiquidityPoolKeysV4): Promise<boolean> {
		if (this.filters.length === 0) {
			return true;
		}

		const stages = await Promise.all(this.filters.map((f) => f.execute(poolKeys)));
		const pass = stages.every((r) => r.ok);

		logger.warn(`\n`);
		for (const stage of stages) {
			logger.warn(`[${stage.ok ? "OK" : "NG"}]_${stage.message}`);
		}

		if (pass) {
			return true;
		}

		return false;
	}
}
