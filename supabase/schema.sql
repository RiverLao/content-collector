-- 第二大脑数据库 Schema

-- 内容表
create table contents (
  id uuid default gen_random_uuid() primary key,
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

-- 用户设置表（存储自定义提示词等）
create table user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,   -- 可以后续扩展为认证用户
  key text not null,
  value text,
  unique(user_id, key)
);

-- 创建索引
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
