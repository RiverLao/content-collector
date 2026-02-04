import { ExtractedContent } from './index'

const JINA_API_URL = 'https://r.jina.ai'

export async function extractWithJina(url: string): Promise<ExtractedContent> {
  const apiKey = process.env.JINA_API_KEY

  let fetchUrl = `${JINA_API_URL}/url/${encodeURIComponent(url)}`
  if (apiKey) {
    fetchUrl = `${JINA_API_URL}/url/${encodeURIComponent(url)}?a=1`
  }

  const headers: HeadersInit = {
    'Accept': 'application/json'
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(fetchUrl, { headers })

  if (!response.ok) {
    throw new Error(`Jina API 错误: ${response.status}`)
  }

  const data = await response.json()

  return {
    url,
    title: data.title || extractTitleFromUrl(url),
    platform: detectPlatform(url),
    content: data.content || data.markdown || '',
    author: data.author,
    publishDate: data.published_at
  }
}

function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase()
  if (urlLower.includes('mp.weixin.qq.com')) return 'wechat'
  if (urlLower.includes('zhihu.com')) return 'zhihu'
  if (urlLower.includes('juejin.cn')) return 'juejin'
  if (urlLower.includes('medium.com')) return 'medium'
  if (urlLower.includes('douban.com')) return 'douban'
  return 'article'
}

function extractTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const segments = pathname.split('/').filter(Boolean)
    return segments[segments.length - 1] || url
  } catch {
    return url
  }
}

// 纯文本提取（用于AI总结）
export async function extractTextOnly(url: string): Promise<string> {
  const response = await fetch(`${JINA_API_URL}/url/${encodeURIComponent(url)}`)

  if (!response.ok) {
    throw new Error(`Jina API 错误: ${response.status}`)
  }

  const data = await response.json()
  return data.content || data.markdown || ''
}
