export interface Content {
  id: string
  url: string
  title: string | null
  platform: string | null
  raw_content: string | null
  ai_summary: string | null
  summary_prompt: string | null
  tags: string[] | null
  is_favorite: boolean | null
  is_deleted: boolean | null
  created_at: string
}

export interface Tag {
  id: string
  name: string
  color: string
  created_at?: string
}

export interface UserSettings {
  custom_prompt?: string
  default_prompt_id?: string
  // 其他设置可以继续添加
}

export interface PresetPrompt {
  id: string
  name: string
  description: string
  prompt: string
}

export interface ExtractResult {
  url: string
  title: string
  platform: string
  content: string
  author?: string
  publishDate?: string
  thumbnail?: string
}

export interface SummarizeResult {
  summary: string
  key_points: string[]
}
