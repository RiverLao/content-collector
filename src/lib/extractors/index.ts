export interface ExtractedContent {
  url: string
  title: string
  platform: string
  content: string
  author?: string
  publishDate?: string
  thumbnail?: string
}

export interface Extractor {
  name: string
  pattern: RegExp
  extract: (url: string, cookie?: string) => Promise<ExtractedContent>
}

// 平台检测
export function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase()

  if (urlLower.includes('xiaohongshu.com') || urlLower.includes('xhscdn.com')) {
    return 'xiaohongshu'
  }
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube'
  }
  if (urlLower.includes('mp.weixin.qq.com') || urlLower.includes('weixin.qq.com')) {
    return 'wechat'
  }
  if (urlLower.includes('zhihu.com')) {
    return 'zhihu'
  }
  if (urlLower.includes('juejin.cn')) {
    return 'juejin'
  }
  if (urlLower.includes('douban.com')) {
    return 'douban'
  }
  if (urlLower.includes('medium.com')) {
    return 'medium'
  }

  return 'generic'
}
