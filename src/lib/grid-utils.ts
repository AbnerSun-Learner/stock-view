import { supabase } from "@/lib/supabase-client";
import type { GridRow, GridType, SavedScheme, StressTest } from "@/types/grid";

// 加载用户保存的方案
export async function loadUserSchemes(userId: string): Promise<SavedScheme[]> {
  try {
    const { data, error } = await supabase
      .from("grid_strategies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(
      (item: {
        id: string;
        name: string;
        created_at: string;
        min_trade_unit: number;
        base_price: number;
        amount_per_grid: number;
        min_price: number;
        small_grid_step: number;
        medium_grid_step: number;
        large_grid_step: number;
        amount_multiplier: number;
        profit_reserve_multiplier: number;
        grid_data: Array<{
          position: number;
          buyTriggerPrice: number;
          buyPrice: number;
          buyAmount: number;
          buyShares: number;
          sellTriggerPrice: number;
          sellPrice: number;
          sellShares: number;
          sellAmount: number;
          priceDropRate?: number;
          expectedProfit?: number;
          type?: string;
        }>;
        stress_test: StressTest;
      }) => {
        // 转换旧格式数据，计算跌幅和网格类型
        const gridData: GridRow[] = (item.grid_data || []).map((row, index) => {
          // 如果有 priceDropRate 就用，否则计算
          let priceDropRate = row.priceDropRate ?? 0;
          if (priceDropRate === 0 && index > 0 && item.grid_data[index - 1]) {
            const prevBuyPrice = item.grid_data[index - 1].buyPrice;
            priceDropRate = parseFloat(
              (((row.buyPrice - prevBuyPrice) / prevBuyPrice) * 100).toFixed(2)
            );
          }

          // 计算相对基准价的总跌幅
          const dropFromBase =
            ((item.base_price - row.buyPrice) / item.base_price) * 100;

          // 根据总跌幅判断网格类型
          let gridType: GridType = "小网";
          if (dropFromBase >= item.large_grid_step) {
            gridType = "大网";
          } else if (dropFromBase >= item.medium_grid_step) {
            gridType = "中网";
          }

          return {
            position: row.position,
            buyTriggerPrice: row.buyTriggerPrice,
            buyPrice: row.buyPrice,
            buyAmount: row.buyAmount,
            buyShares: row.buyShares,
            sellTriggerPrice: row.sellTriggerPrice,
            sellPrice: row.sellPrice,
            sellShares: row.sellShares,
            sellAmount: row.sellAmount,
            priceDropRate,
            gridType,
          };
        });

        return {
          id: item.id,
          name: item.name,
          timestamp: new Date(item.created_at).getTime(),
          params: {
            minTradeUnit: item.min_trade_unit,
            basePrice: item.base_price,
            amountPerGrid: item.amount_per_grid,
            minPrice: item.min_price,
            smallGridStep: item.small_grid_step,
            mediumGridStep: item.medium_grid_step,
            largeGridStep: item.large_grid_step,
            amountMultiplier: item.amount_multiplier,
            profitReserveMultiplier: item.profit_reserve_multiplier,
            priceUnit: 0.001, // 默认值，旧数据可能没有这个字段
          },
          gridData,
          stressTest: item.stress_test || null,
        };
      }
    );
  } catch (error) {
    console.error("加载方案失败:", error);
    return [];
  }
}

// 保存方案到 Supabase
export async function saveSchemeToSupabase(
  userId: string,
  scheme: SavedScheme
): Promise<void> {
  const { error } = await supabase.from("grid_strategies").insert({
    user_id: userId,
    name: scheme.name,
    min_trade_unit: scheme.params.minTradeUnit,
    base_price: scheme.params.basePrice,
    amount_per_grid: scheme.params.amountPerGrid,
    min_price: scheme.params.minPrice,
    small_grid_step: scheme.params.smallGridStep,
    medium_grid_step: scheme.params.mediumGridStep,
    large_grid_step: scheme.params.largeGridStep,
    amount_multiplier: scheme.params.amountMultiplier,
    profit_reserve_multiplier: scheme.params.profitReserveMultiplier,
    grid_data: scheme.gridData,
    stress_test: scheme.stressTest,
  });

  if (error) throw error;
}
