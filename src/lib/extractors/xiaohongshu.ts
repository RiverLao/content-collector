import { ExtractedContent } from './index'

const XIAOHONGSHU_API = 'https://www.xiaohongshu.com'

export async function extractXiaohongshu(
  url: string,
  cookie?: string
): Promise<ExtractedContent> {
  const noteId = extractNoteId(url)
  if (!noteId) {
    throw new Error('无法解析小红书 URL')
  }

  // 小红书 Web API 需要登录态
  const headers: HeadersInit = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': XIAOHONGSHU_API
  }

  if (cookie) {
    headers['Cookie'] = cookie
  }

  // 尝试获取笔记详情
  const apiUrl = `https://www.xiaohongshu.com/api/web/notebook/detail?note_id=${noteId}`
  const response = await fetch(apiUrl, { headers })

  if (!response.ok) {
    // 如果 API 失败，尝试使用 Jina 提取
    return await extractViaJina(url)
  }

  const data = await response.json()

  if (data.success && data.data) {
    const note = data.data

    // 提取内容
    let content = ''
    if (note.desc) {
      content += `标题: ${note.desc}\n\n`
    }
    if (note.note_commnets) {
      content += `正文:\n${note.note_commnets}\n\n`
    }
    if (note.image_list) {
      content += `图片数量: ${note.image_list.length}张\n`
    }

    return {
      url,
      title: note.title || note.desc || '小红书笔记',
      platform: 'xiaohongshu',
      content: content,
      author: note.user?.nickname
    }
  }

  // 回退到 Jina
  return await extractViaJina(url)
}

function extractNoteId(url: string): string | null {
  const patterns = [
    /xiaohongshu\.com\/explore\/([a-zA-Z0-9]+)/,
    /xhscdn\.com\/group\/([a-zA-Z0-9]+)/,
    /note\.app\/([a-zA-Z0-9]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

async function extractViaJina(url: string): Promise<ExtractedContent> {
  const jinaUrl = `https://r.jina.ai/url/${encodeURIComponent(url)}`
  const response = await fetch(jinaUrl)
  const content = await response.text()

  // 解析 Jina 返回的内容
  const lines = content.split('\n')
  let title = ''
  let body = ''

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.replace('# ', '').trim()
    } else if (!title) {
      title = line
    } else {
      body += line + '\n'
    }
  }

  return {
    url,
    title: title || '小红书笔记',
    platform: 'xiaohongshu',
    content: body.trim()
  }
}
