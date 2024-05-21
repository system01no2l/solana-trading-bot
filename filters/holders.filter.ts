import { Filter, FilterResult,  PoolFilterArgs } from './interface.filter';
import { LiquidityPoolKeysV4, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import { Connection, PublicKey, RpcResponseAndContext, TokenAccountBalancePair } from '@solana/web3.js';
import { logger } from '../helpers';

export class TopHoldersFilter implements Filter {
  constructor(
    private readonly connection: Connection,
    private readonly quoteToken: Token,
    private readonly topN: number, // Số lượng tài khoản nắm giữ hàng đầu cần lấy
  ) {}

  async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
    try {
      // Lấy danh sách các tài khoản nắm giữ lớn nhất của token
      const response: RpcResponseAndContext<TokenAccountBalancePair[]> = await this.connection.getTokenLargestAccounts(
        poolKeys.lpMint, // Sử dụng địa chỉ lpMint của pool
        this.connection.commitment 
      );

      // Giải cấu trúc từ RpcResponseAndContext để lấy mảng TokenAccountBalancePair
      const accounts: TokenAccountBalancePair[] = response.value;

      // Kiểm tra xem có đủ thông tin tài khoản không
      if (accounts.length >= this.topN) {
        // Giả sử chúng ta chỉ quan tâm đến tổng số lượng của top N tài khoản
        const excludeAddress = new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");

        const topHoldersSum: TokenAmount = accounts
          .slice(0, this.topN)
          //.filter(account => !account.address.equals(excludeAddress))
          .reduce<TokenAmount>(
            (sum: TokenAmount, account: TokenAccountBalancePair): TokenAmount => {
              // Chuyển đổi số lượng account thành TokenAmount của quoteToken
              const accountAmount = new TokenAmount(this.quoteToken, account.amount, true);
              return sum.add(accountAmount);
            },
            new TokenAmount(this.quoteToken, 0, true) // Khởi tạo sum là 0
          );

        const isTopHolders = this.isGreaterThan(topHoldersSum, new TokenAmount(this.quoteToken, 0, true)); // Đặt điều kiện theo nhu cầu

        return {
          ok: isTopHolders,
          message: isTopHolders
            ? `[TopHolders] -> Top ${this.topN} holders qualify`
            : `[TopHolders] -> Top ${this.topN} holders do not qualify`,
        };
      } else {
        return { ok: false, message: `[TopHolders] -> Không đủ tài khoản để kiểm tra top ${this.topN}` };
      }
    } catch (error) {
      logger.error({ mint: poolKeys.baseMint }, `Không thể lấy thông tin các tài khoản nắm giữ lớn nhất`);
      return { ok: false, message: '[TopHolders] -> Không thể lấy thông tin các tài khoản nắm giữ lớn nhất' };
    }
  }

  // Hàm so sánh đơn giản để so sánh hai đối tượng TokenAmount
  isGreaterThan(a: TokenAmount, b: TokenAmount): boolean {
    return a.raw.gt(b.raw);
  }
}
