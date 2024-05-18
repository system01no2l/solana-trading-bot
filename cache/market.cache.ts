import { Connection, PublicKey } from '@solana/web3.js';
import { getMinimalMarketV3, logger, MINIMAL_MARKET_STATE_LAYOUT_V3, MinimalMarketLayoutV3 } from '../helpers';
import { MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3, Token } from '@raydium-io/raydium-sdk';

export class MarketCache {
    // Map lưu trữ thông tin các thị trường với key là ID của thị trường và value là thông tin thị trường.
    private readonly keys: Map<string, MinimalMarketLayoutV3> = new Map<string, MinimalMarketLayoutV3>();

    // Constructor nhận vào một đối tượng Connection để thực hiện các thao tác với Solana blockchain.
    constructor(private readonly connection: Connection) {}

    // Hàm init để lấy và lưu tất cả các thị trường hiện có của một loại quote token cụ thể.
    async init(config: { quoteToken: Token }) {
        logger.debug(`Fetching all existing ${config.quoteToken.symbol} markets...`);

        // Lấy tất cả các tài khoản chương trình thị trường từ blockchain, lọc theo token quote.
        const accounts = await this.connection.getProgramAccounts(MAINNET_PROGRAM_ID.OPENBOOK_MARKET, {
            commitment: this.connection.commitment,
            dataSlice: {
                offset: MARKET_STATE_LAYOUT_V3.offsetOf('eventQueue'),
                length: MINIMAL_MARKET_STATE_LAYOUT_V3.span,
            },
            filters: [
                { dataSize: MARKET_STATE_LAYOUT_V3.span },
                {
                    memcmp: {
                        offset: MARKET_STATE_LAYOUT_V3.offsetOf('quoteMint'),
                        bytes: config.quoteToken.mint.toBase58(),
                    },
                },
            ],
        });

        // Duyệt qua các tài khoản và giải mã dữ liệu, sau đó lưu vào Map.
        accounts.forEach(account => {
            const market = MINIMAL_MARKET_STATE_LAYOUT_V3.decode(account.account.data);
            this.keys.set(account.pubkey.toString(), market);
        });

        logger.debug(`Cached ${this.keys.size} markets`);
    }

    // Hàm save để lưu thông tin thị trường mới vào Map nếu chưa tồn tại.
    save(marketId: string, keys: MinimalMarketLayoutV3) {
        if (!this.keys.has(marketId)) {
            logger.trace(`Caching new market: ${marketId}`);
            this.keys.set(marketId, keys);
        }
    }

    // Hàm get để lấy thông tin thị trường từ Map hoặc từ blockchain nếu chưa có.
    async get(marketId: string): Promise<MinimalMarketLayoutV3> {
        if (this.keys.has(marketId)) {
            return this.keys.get(marketId)!;
        }

        logger.trace(`Fetching new market keys for ${marketId}`);
        const market = await this.fetch(marketId);
        this.keys.set(marketId, market);
        return market;
    }

    // Hàm fetch để lấy thông tin thị trường từ blockchain.
    private fetch(marketId: string): Promise<MinimalMarketLayoutV3> {
        return getMinimalMarketV3(this.connection, new PublicKey(marketId), this.connection.commitment);
    }
}
