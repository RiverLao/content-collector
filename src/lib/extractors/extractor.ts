import { ExtractedContent } from './index'
import { extractYouTube } from './youtube'
import { extractXiaohongshu } from './xiaohongshu'
import { extractWithJina } from './jina'

export async function extractContent(
  url: string,
  options?: {
    xiaohongshuCookie?: string
    useJina?: boolean
  }
): Promise<ExtractedContent> {
  const urlLower = url.toLowerCase()

  // 根据平台选择提取方式
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return await extractYouTube(url)
  }

  if (urlLower.includes('xiaohongshu.com') || urlLower.includes('xhscdn.com')) {
    return await extractXiaohongshu(url, options?.xiaohongshuCookie)
  }

  // 默认使用 Jina 提取（支持大部分网站）
  if (options?.useJina !== false) {
    try {
      return await extractWithJina(url)
    } catch (error) {
      console.error('Jina 提取失败:', error)
      // 如果 Jina 也失败，返回基本信息
      return {
        url,
        title: extractTitleFromUrl(url),
        platform: detectPlatform(url),
        content: ''
      }
    }
  }

  // 最后回退
  return {
    url,
    title: extractTitleFromUrl(url),
    platform: detectPlatform(url),
    content: ''
  }
}

function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase()

  if (urlLower.includes('xiaohongshu.com')) return 'xiaohongshu'
  if (urlLower.includes('youtube.com')) return 'youtube'
  if (urlLower.includes('mp.weixin.qq.com')) return 'wechat'
  if (urlLower.includes('zhihu.com')) return 'zhihu'
  if (urlLower.includes('juejin.cn')) return 'juejin'
  if (urlLower.includes('douban.com')) return 'douban'
  if (urlLower.includes('medium.com')) return 'medium'
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter'

  return 'link'
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.split('/').filter(Boolean)
    const lastSegment = pathname[pathname.length - 1] || urlObj.hostname
    // 解码 URL 编码的标题
    return decodeURIComponent(lastSegment)
      .replace(/[-_]/g, ' ')
      .replace(/\.\w+$/, '')
      .substring(0, 100)
  } catch {
    return url
  }
}

// 统一提取接口
export interface UnifiedExtractor {
  extract: (url: string, cookie?: string) => Promise<ExtractedContent>
}

// 平台图标映射
export const platformIcons: Record<string, string> = {
  xiaohongshu: '📕',
  youtube: '📺',
  wechat: '💬',
  zhihu: '💭',
  juejin: '💻',
  douban: '🎬',
  medium: '📰',
  twitter: '🐦',
  link: '🔗'
}

// 平台名称映射
export const platformNames: Record<string, string> = {
  xiaohongshu: '小红书',
  youtube: 'YouTube',
  wechat: '微信公众号',
  zhihu: '知乎',
  juejin: '掘金',
  douban: '豆瓣',
  medium: 'Medium',
  twitter: 'Twitter/X',
  link: '链接'
}
