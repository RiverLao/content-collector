import { ExtractedContent } from './index'

export async function extractYouTube(url: string): Promise<ExtractedContent> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error('无法解析 YouTube URL')
  }

  // 获取视频信息
  const infoUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
  const infoResponse = await fetch(infoUrl)
  const infoData = await infoResponse.json()

  // 获取视频描述
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  const oEmbedResponse = await fetch(oEmbedUrl)
  const oEmbedData = await oEmbedResponse.json()

  // 使用 Jina 提取完整内容（描述+可能的其他内容）
  const contentUrl = `https://r.jina.ai/url/https://www.youtube.com/watch?v=${videoId}`
  const contentResponse = await fetch(contentUrl)
  const fullContent = await contentResponse.text()

  return {
    url,
    title: infoData.title || oEmbedData.title || 'YouTube 视频',
    platform: 'youtube',
    content: fullContent || oEmbedData.description || '',
    author: infoData.author_name || oEmbedData.author_name,
    thumbnail: oEmbedData.thumbnail_url
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}
