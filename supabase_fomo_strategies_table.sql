-- 创建 FOMO Killer 策略表
-- 在 Supabase SQL Editor 中执行此 SQL

CREATE TABLE IF NOT EXISTS fomo_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  historical_high NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  min_trade_unit INTEGER NOT NULL,
  force_buy_one_lot BOOLEAN DEFAULT FALSE,
  bottom_expectation VARCHAR(20) NOT NULL CHECK (bottom_expectation IN ('conservative', 'neutral', 'aggressive')),
  grid_step NUMERIC NOT NULL,
  total_capital NUMERIC NOT NULL,
  max_loss NUMERIC NOT NULL,
  profit_strategy VARCHAR(20) NOT NULL CHECK (profit_strategy IN ('dynamic', 'fixed')),
  shallow_profit NUMERIC DEFAULT 10,
  deep_profit NUMERIC DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_fomo_strategies_user_id ON fomo_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_fomo_strategies_created_at ON fomo_strategies(created_at);

-- 启用 Row Level Security (RLS)
ALTER TABLE fomo_strategies ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看和操作自己的策略
CREATE POLICY "Users can view their own fomo strategies"
  ON fomo_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fomo strategies"
  ON fomo_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fomo strategies"
  ON fomo_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fomo strategies"
  ON fomo_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_fomo_strategies_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fomo_strategies_updated_at
  BEFORE UPDATE ON fomo_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_fomo_strategies_updated_at_column();












