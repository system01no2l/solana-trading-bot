import { Filter, FilterResult,  PoolFilterArgs } from './interface.filter';
import { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk';
import { logger } from '../helpers';
import axios from 'axios';

// Định nghĩa kiểu dữ liệu cho phản hồi API
interface TopHolder {
    address: string;
    amount_percentage: number;
}

interface ApiResponse {
    code: number;
    data: TopHolder[];
}

export class RatTraderFilter implements Filter {
    async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
        try {
            // Gọi API để lấy danh sách các tài khoản nắm giữ hàng đầu với tag "rat_trader"
            const response = await axios.get<ApiResponse>(`https://gmgn.ai/defi/quotation/v1/tokens/top_holders/sol/${poolKeys.baseMint}?tag=rat_trader`);
            const { code, data } = response.data;

            // Kiểm tra xem API trả về dữ liệu hợp lệ không
            if (code === 0 && Array.isArray(data)) {
                const ratTraderPercentageSum = data.reduce((sum: number, holder: TopHolder) => sum + holder.amount_percentage, 0);

                // Kiểm tra tỷ lệ nắm giữ của các tài khoản "rat trader"
                if (ratTraderPercentageSum > 0.5) {
                    return { ok: false, message: `[RatTrader] -> Rat traders hold ${(ratTraderPercentageSum * 100).toFixed(2)}% of the token supply` };
                }

                return { ok: true, message: '[RatTrader] -> Rat traders hold less than 50% of the token supply' };
            }

            // Xử lý trường hợp không thể lấy dữ liệu top holders
            return { ok: false, message: '[RatTrader] -> Unable to retrieve top holders data' };
        } catch (error: any) {
            // Ghi lại lỗi chi tiết để dễ dàng gỡ lỗi
            logger.error({ mint: poolKeys.baseMint, error: error.message }, '[RatTrader] -> Failed to check for rat traders');
            return { ok: false, message: '[RatTrader] -> Failed to check for rat traders' };
        }
    }
}
