/**
 * 微信模板消息构建工具
 * 统一模板消息格式，避免重复代码
 */

interface PriceData {
  symbol: string;
  name: string;
  highest: number;
  current: number;
  target80: number;
}

/**
 * 构建推送模板消息数据
 */
export function buildPushTemplateData(
  priceData: PriceData
): Record<string, { value: string; color?: string }> {
  // 计算预期跌幅百分比
  const expectedDrop =
    ((priceData.current - priceData.target80) / priceData.current) * 100;

  return {
    first: {
      value: `${priceData.name} (${priceData.symbol}) 收盘价推送`,
      color: "#173177",
    },
    keyword1: {
      value: priceData.highest.toFixed(3),
      color: "#173177",
    },
    keyword2: {
      value: priceData.current.toFixed(3),
      color: "#173177",
    },
    keyword3: {
      value: priceData.target80.toFixed(3),
      color: "#173177",
    },
    keyword4: {
      value: `${expectedDrop.toFixed(2)}%`,
      color: "#173177",
    },
    remark: {
      value: "数据仅供参考，投资有风险",
      color: "#999999",
    },
  };
}
