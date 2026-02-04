const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

export interface SummarizeResult {
  summary: string
  key_points: string[]
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 默认系统提示词
export const DEFAULT_PROMPT = `请对以下内容进行总结，提取核心要点。用简洁的语言概括主要内容，包括：
1. 文章/视频的核心主题是什么
2. 主要观点或结论
3. 关键数据和例子
4. 实用的建议或洞见

请用 Markdown 格式输出总结。`

export async function summarizeContent(
  content: string,
  customPrompt?: string
): Promise<SummarizeResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('未配置 DeepSeek API Key')
  }

  const systemPrompt = customPrompt || DEFAULT_PROMPT

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请总结以下内容：\n\n${content}` }
  ]

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 2048,
        temperature: 0.7,
        stream: false
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API 错误: ${error}`)
    }

    const data = await response.json()
    const summaryText = data.choices?.[0]?.message?.content || ''

    // 解析要点列表
    const keyPoints = extractKeyPoints(summaryText)

    return {
      summary: summaryText,
      key_points: keyPoints
    }
  } catch (error) {
    console.error('AI 总结失败:', error)
    throw error
  }
}

// 从总结文本中提取要点列表
function extractKeyPoints(text: string): string[] {
  const points: string[] = []

  // 匹配各种列表格式
  const patterns = [
    /^[•\-\*]\s*(.+)$/gm,
    /^\d+[.）)]\s*(.+)$/gm,
    /^\[?\d+\]?\s*(.+)$/gm
  ]

  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      points.push(...matches.map(m => m.replace(/^[•\-\*\d]+\.?\s*\]?\s*/, '').trim()))
    }
  }

  // 如果没有找到列表，返回空数组（由前端处理）
  return points
}

export async function streamSummarize(
  content: string,
  customPrompt: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('未配置 DeepSeek API Key')
  }

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: customPrompt },
    { role: 'user', content: `请总结以下内容：\n\n${content}` }
  ]

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 2048,
      temperature: 0.7,
      stream: true
    })
  })

  if (!response.ok) {
    throw new Error('DeepSeek API 错误')
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) return

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') break

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }
}
