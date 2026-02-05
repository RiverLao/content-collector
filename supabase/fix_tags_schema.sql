-- 1. Add 'user_id' column to 'tags' table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Remove the unique constraint on 'name'
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;

-- 3. Add a composite unique constraint on (user_id, name)
ALTER TABLE tags ADD CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name);

-- 4. Update the RLS policy for 'tags' table
DROP POLICY IF EXISTS "用户只能管理自己的标签" ON tags;

CREATE POLICY "用户只能管理自己的标签" ON tags
  FOR ALL USING (auth.uid() = user_id);
