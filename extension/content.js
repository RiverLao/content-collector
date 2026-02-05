// content.js - 注入到每个页面，提取内容

// 等待页面加载完成
function extractContent() {
  const result = {
    url: window.location.href,
    title: '',
    content: '',
    author: '',
    platform: ''
  }

  // 提取标题
  result.title = extractTitle()

  // 提取作者
  result.author = extractAuthor()

  // 提取正文内容
  result.content = extractMainContent()

  // 识别平台
  result.platform = detectPlatform()

  return result
}

function extractTitle() {
  // 优先使用 Open Graph 标题
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle?.content) return ogTitle.content.trim()

  // 其次使用页面标题
  const pageTitle = document.title
  if (pageTitle) return pageTitle.trim()

  // 最后使用 h1
  const h1 = document.querySelector('h1')
  if (h1?.innerText) return h1.innerText.trim()

  return ''
}

function extractAuthor() {
  // 尝试多种选择器
  const selectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    '.author-name',
    '.user-name',
    '.nickname',
    '[rel="author"]',
    '.zu-top-authentication-bar li:first-child span',
    '.creator-info',
    '.name-card'
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) {
      const text = el.innerText || el.content || el.textContent
      if (text?.trim() && text.trim().length < 50) {
        return text.trim()
      }
    }
  }

  return ''
}

function extractMainContent() {
  // 移除不需要的元素
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    '.advertisement', '.ad', '.ads', '.comment', '.comments',
    '.sidebar', '.siderbar', '.related', '.recommend',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]'
  ]

  // 克隆文档以便操作
  const clone = document.body.cloneNode(true)

  // 移除不需要的元素
  unwantedSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove())
  })

  // 尝试找到主要内容区域
  const mainSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content-body',
    '.rich-text',
    '.zb-content',
    '.detail-content'
  ]

  let mainContent = null
  for (const sel of mainSelectors) {
    const el = clone.querySelector(sel)
    if (el && el.innerText.length > 200) {
      mainContent = el
      break
    }
  }

  // 如果没找到，尝试找最大的文本块
  if (!mainContent) {
    const allElements = clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div')
    let maxLength = 0
    let bestEl = null

    allElements.forEach(el => {
      const text = el.innerText?.trim() || ''
      if (text.length > maxLength) {
        maxLength = text.length
        bestEl = el
      }
    })

    if (bestEl) {
      // 尝试找到父容器
      let parent = bestEl.parentElement
      while (parent && parent.parentElement !== clone) {
        const parentText = parent.innerText?.trim() || ''
        if (parentText.length > maxLength * 1.5) {
          maxLength = parentText.length
          bestEl = parent
        }
        parent = parent.parentElement
      }
      mainContent = bestEl
    }
  }

  // 提取纯文本
  if (mainContent) {
    // 移除所有子元素的样式
    const tempDiv = document.createElement('div')
    tempDiv.appendChild(mainContent.cloneNode(true))

    // 清理样式标签
    tempDiv.querySelectorAll('style, script, iframe, img, video, audio').forEach(el => el.remove())

    // 获取纯文本，限制长度
    let text = tempDiv.innerText || ''

    // 清理空白
    text = text.replace(/\s+/g, ' ').trim()

    // 限制在 15000 字符内（足够总结使用）
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '...'
    }

    return text
  }

  return document.body.innerText?.substring(0, 15000) || ''
}

function detectPlatform() {
  const url = window.location.href.toLowerCase()

  if (url.includes('zhihu.com')) return 'zhihu'
  if (url.includes('mp.weixin.qq.com')) return 'wechat'
  if (url.includes('xiaohongshu.com') || url.includes('xhscdn.com')) return 'xiaohongshu'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('juejin.cn')) return 'juejin'
  if (url.includes('douban.com')) return 'douban'
  if (url.includes('medium.com')) return 'medium'
  if (url.includes('weibo.com')) return 'weibo'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('v2ex.com')) return 'v2ex'

  return 'article'
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const content = extractContent()
    sendResponse(content)
  }
})
