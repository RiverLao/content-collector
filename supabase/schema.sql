-- 第二大脑数据库 Schema

-- 内容表（按用户隔离）
create table contents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),  -- 关联用户
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
create table tags (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  color text default '#3B82F6',
  created_at timestamptz default now()
);

-- 用户设置表（按用户隔离）
create table user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,  -- 关联用户
  key text not null,
  value text,
  unique(user_id, key)
);

-- 启用 RLS
alter table contents enable row level security;
alter table tags enable row level security;
alter table user_settings enable row level security;

-- RLS 策略：用户只能看到自己的数据
create policy "用户只能查看自己的内容" on contents
  for all using (auth.uid() = user_id);

create policy "用户只能管理自己的标签" on tags
  for all using (auth.uid() = user_id);

create policy "用户只能管理自己的设置" on user_settings
  for all using (auth.uid() = user_id);

-- 创建索引
create index idx_contents_user_id on contents(user_id);
create index idx_contents_created_at on contents(created_at desc);
create index idx_contents_tags on contents using gin(tags);
create index idx_contents_url on contents(url);
create index idx_contents_favorite on contents(is_favorite) where is_favorite = true;
create index idx_contents_deleted on contents(is_deleted) where is_deleted = false;

-- 添加几条预设标签
insert into tags (name, color) values
  ('学习', '#3B82F6'),
  ('技术', '#10B981'),
  ('产品', '#F59E0B'),
  ('生活', '#EC4899'),
  ('投资', '#8B5CF6'),
  ('阅读', '#06B6D4');
