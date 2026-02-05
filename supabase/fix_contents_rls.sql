-- Fix RLS policy for contents table
-- Issue: Previous policy only used 'using', causing "new row violates row-level security policy" on INSERT
-- Solution: Explicitly add 'with check' clause for INSERT validation

-- 1. Drop the existing policy
drop policy if exists "用户只能查看自己的内容" on contents;

-- 2. Create comprehensive policy covering SELECT, INSERT, UPDATE, DELETE
create policy "用户只能查看自己的内容" on contents
  for all 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
