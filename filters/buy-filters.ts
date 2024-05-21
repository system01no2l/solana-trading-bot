import { Connection } from '@solana/web3.js';
import { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk';
import { RugCheckFilter } from './rug-check.filter';
import { RatTraderFilter } from './rat.filter';
import { Filter, FilterResult,  PoolFilterArgs } from './interface.filter';

import {
	CHECK_GMGN,
	CHECK_RATS,
	logger
} from '../helpers';

export class BuyFilters {
	private readonly filters: Filter[] = [];

	constructor(
		readonly connection: Connection,
		readonly args: PoolFilterArgs,
	) {

		if (CHECK_GMGN) {
			this.filters.push(new RugCheckFilter());
		}

		if (CHECK_RATS) {
			this.filters.push(new RatTraderFilter());
		}

	}

	public async execute(poolKeys: LiquidityPoolKeysV4): Promise<boolean> {
		if (this.filters.length === 0) {
			return false;
		}

		const result = await Promise.all(this.filters.map((f) => f.execute(poolKeys)));
		const pass = result.every((r) => r.ok);

		if (pass) {
			return true;
		}

		for (const filterResult of result.filter((r) => !r.ok)) {
			logger.trace(filterResult.message);
		}

		return false;
	}
}