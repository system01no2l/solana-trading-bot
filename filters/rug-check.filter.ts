import { Filter, FilterResult,  PoolFilterArgs } from './interface.filter';
import { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk';
import { logger } from '../helpers';
import axios from 'axios';

// Định nghĩa kiểu dữ liệu cho phản hồi API
interface TokenData {
  rug_ratio: number;
  is_show_alert: string;
  burn_ratio: number;
  top_10_holder_rate: number;
  renounced_mint: number;
  renounced_freeze_account: number;
  buy_volume_1m: number;
}

interface ApiResponse {
  code: number;
  data: {
    token: TokenData;
  };
}

export class RugCheckFilter implements Filter {
  async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
    try {
      // Gọi API để lấy thông tin chi tiết của token
      const response = await axios.get<ApiResponse>(`https://gmgn.ai/defi/quotation/v1/tokens/sol/${poolKeys.baseMint}`);
      const { code, data } = response.data;

      // Kiểm tra xem API trả về dữ liệu hợp lệ không
      if (code === 0 && data && data.token) {
        const {
          rug_ratio,
          is_show_alert,
          burn_ratio,
          top_10_holder_rate,
          renounced_mint,
          renounced_freeze_account,
          buy_volume_1m,
        } = data.token;

        // Kiểm tra các điều kiện khác nhau
        if (rug_ratio > 0.1) {
          return { ok: false, message: '[GMGN] Check -> Token has a rug_ratio greater than 10%' };
        }

        if (is_show_alert === 'true') {
          return { ok: false, message: '[GMGN] Check -> Token has a warning alert' };
        }

        if (burn_ratio < 0.8) {
          return { ok: false, message: '[GMGN] Check -> Liquidity pool isn\'t burnt' };
        }

        if (top_10_holder_rate > 0.5) {
          return { ok: false, message: '[GMGN] Check -> Top 10 holders greater than 50%' };
        }

        if (renounced_mint < 1) {
          return { ok: false, message: '[GMGN] Check -> Mint is not renounced' };
        }

        if (renounced_freeze_account < 1) {
          return { ok: false, message: '[GMGN] Check -> Blacklist is not frozen' };
        }

        if (buy_volume_1m < 1000) {
          return { ok: false, message: '[GMGN] Check -> 5m buy volume is less than 1000' };
        }

        // Nếu tất cả các điều kiện đều qua, trả về kết quả OK
        return { ok: true, message:  '[GMGN] Check ok !!!' };
      }

      // Xử lý trường hợp không thể lấy dữ liệu chi tiết token
      return { ok: false, message: '[GMGN] Check -> Unable to retrieve token details' };
    } catch (error: any) {
      // Ghi lại lỗi chi tiết để dễ dàng gỡ lỗi
      logger.error({ mint: poolKeys.baseMint, error: error.message }, '[GMGN] Check -> Failed to check token details');
      return { ok: false, message: '[GMGN] Check -> Failed to check token details' };
    }
  }
}