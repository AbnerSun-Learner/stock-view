-- 创建网格策略表
-- 在 Supabase SQL Editor 中执行此 SQL

CREATE TABLE IF NOT EXISTS grid_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_trade_unit NUMERIC NOT NULL,
  base_price NUMERIC NOT NULL,
  amount_per_grid NUMERIC NOT NULL,
  min_price NUMERIC NOT NULL,
  small_grid_step NUMERIC NOT NULL,
  medium_grid_step NUMERIC NOT NULL,
  large_grid_step NUMERIC NOT NULL,
  position_multiplier NUMERIC NOT NULL,
  amount_multiplier NUMERIC NOT NULL,
  profit_reserve_multiplier NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_grid_strategies_user_id ON grid_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_grid_strategies_created_at ON grid_strategies(created_at);

-- 启用 Row Level Security (RLS)
ALTER TABLE grid_strategies ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看和操作自己的网格策略
CREATE POLICY "Users can view their own grid strategies"
  ON grid_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grid strategies"
  ON grid_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grid strategies"
  ON grid_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grid strategies"
  ON grid_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grid_strategies_updated_at
  BEFORE UPDATE ON grid_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

