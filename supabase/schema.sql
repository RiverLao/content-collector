-- 第二大脑数据库 Schema
-- 上次更新: 修复 tags 表结构，增加 user_id 并移除 name 全局唯一约束

-- 内容表（按用户隔离）
create table if not exists contents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,  -- 关联用户（不设置外键约束，RLS 使用 auth.uid()）
  url text not null,
  title text,
  platform text,
  raw_content text,        -- 原始内容（用于二次处理）
  ai_summary text,         -- AI总结
  summary_prompt text,     -- 使用的总结提示词
  tags text[],             -- 标签数组
  is_favorite boolean default false,  -- 是否收藏
  is_deleted boolean default false,    -- 是否删除（软删除）
  created_at timestamptz default now()
);

-- 标签表
create table if not exists tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id), -- 关联用户
  name text not null,
  color text default '#3B82F6',
  created_at timestamptz default now(),
  unique(user_id, name) -- 每个用户的标签名唯一
);

-- 用户设置表（按用户隔离）
create table if not exists user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,  -- 关联用户
  key text not null,
  value text,
  unique(user_id, key)
);

-- 启用 RLS
alter table contents enable row level security;
alter table tags enable row level security;
alter table user_settings enable row level security;

-- RLS 策略：用户只能看到自己的数据
-- 先删除旧策略以防冲突
drop policy if exists "用户只能查看自己的内容" on contents;
drop policy if exists "用户只能管理自己的标签" on tags;
drop policy if exists "用户只能管理自己的设置" on user_settings;

create policy "用户只能查看自己的内容" on contents
  for all 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id); user_id)
  with check (auth.uid() = user_id);

create policy "用户只能管理自己的标签" on tags
  for all using (auth.uid() = user_id);

create policy "用户只能管理自己的设置" on user_settings
  for all using (auth.uid() = user_id);

-- 创建索引
create index if not exists idx_contents_user_id on contents(user_id);
create index if not exists idx_contents_created_at on contents(created_at desc);
create index if not exists idx_contents_tags on contents using gin(tags);
create index if not exists idx_contents_url on contents(url);
create index if not exists idx_contents_favorite on contents(is_favorite) where is_favorite = true;
create index if not exists idx_contents_deleted on contents(is_deleted) where is_deleted = false;

-- 标签表的索引
create index if not exists idx_tags_user_id on tags(user_id);

-- 注意：预设标签插入脚本已移除，因为现在标签必须关联到具体用户。
-- 如果需要系统级公共标签，建议另建 system_tags 表或使用 user_id 为 NULL 的约定（需调整 RLS）。
