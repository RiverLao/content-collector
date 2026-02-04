// content.js - 注入到每个页面，提取内容

// 检测是否支持外部脚本（CSP检查）
const isCspRestricted = (() => {
  try {
    // 尝试创建一个 script 元素并设置 src
    const testScript = document.createElement('script')
    testScript.src = 'data:text/javascript,void(0)'
    document.head.appendChild(testScript)
    document.head.removeChild(testScript)
    return false
  } catch (e) {
    return true
  }
})()

// CSP 受限的平台列表（这些平台会阻止外部脚本加载）
const CSP_RESTRICTED_PLATFORMS = [
  'xiaohongshu.com',
  'zhihu.com',
  'douban.com',
  'weibo.com'
]

// 检测当前页面是否在 CSP 受限平台上
function isOnCspRestrictedPlatform() {
  const url = window.location.href.toLowerCase()
  return CSP_RESTRICTED_PLATFORMS.some(domain => url.includes(domain))
}

// 动态加载脚本
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = (e) => reject(new Error(`无法加载脚本: ${src}`))
    document.head.appendChild(script)
  })
}

// OCR 识别单张图片（仅在支持外部脚本的平台可用）
async function recognizeImage(imageUrl, useOcr) {
  // CSP 受限平台跳过 OCR
  if (isOnCspRestrictedPlatform()) {
    console.log('当前平台不支持 OCR（安全策略限制）')
    return ''
  }

  if (!useOcr) return ''

  try {
    // 动态加载 Tesseract.js
    if (typeof Tesseract === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js')
    }

    const worker = await Tesseract.createWorker('chi_sim+eng')
    const { data: { text } } = await worker.recognize(imageUrl)
    return text.trim()
  } catch (error) {
    console.log('OCR 识别不可用:', error.message)
    return ''
  }
}

// 提取页面中所有图片的文字
async function extractImagesText(useOcr = true) {
  // CSP 受限平台直接返回空
  if (isOnCspRestrictedPlatform()) {
    return ''
  }

  const results = []

  // 找到所有图片（排除头像、图标等小图）
  const images = Array.from(document.querySelectorAll('img'))
    .filter(img => {
      // 排除小图（头像、表情等）
      const rect = img.getBoundingClientRect()
      return rect.width > 100 && rect.height > 100
    })
    .map(img => img.src)
    .filter(src => {
      // 排除 data URI 和很小的图
      if (src.startsWith('data:')) return false
      if (src.includes('avatar') || src.includes('icon') || src.includes('emoticon')) return false
      return true
    })

  // 去重
  const uniqueImages = [...new Set(images)].slice(0, 10) // 最多识别 10 张

  for (let i = 0; i < uniqueImages.length; i++) {
    const imageUrl = uniqueImages[i]
    try {
      const text = await recognizeImage(imageUrl)
      if (text.length > 10) { // 只保留有意义的识别结果
        results.push(`【图片${i + 1}文字】\n${text}`)
      }
    } catch (e) {
      // 跳过失败的图片
    }

    // 显示进度（通过 chrome.runtime.sendMessage）
    try {
      chrome.runtime.sendMessage({
        action: 'ocrProgress',
        current: i + 1,
        total: uniqueImages.length
      })
    } catch (e) {
      // popup 可能已关闭
    }
  }

  return results.join('\n\n')
}

// 等待页面加载完成
async function extractContent(options = {}) {
  const { enableOcr = false } = options

  const result = {
    url: window.location.href,
    title: '',
    content: '',
    author: '',
    platform: '',
    ocrText: '',
    enableOcr: enableOcr
  }

  console.log('Extracting content from:', window.location.href)

  // 提取标题
  result.title = extractTitle()
  console.log('Extracted title:', result.title?.substring(0, 50))

  // 提取作者
  result.author = extractAuthor()
  console.log('Extracted author:', result.author)

  // 提取正文内容
  result.content = extractMainContent()
  console.log('Extracted content length:', result.content.length)

  // 识别平台
  result.platform = detectPlatform()
  console.log('Detected platform:', result.platform)

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
    '.name-card',
    // 小红书作者选择器
    '[class*="author"]',
    '[class*="user-name"]',
    '[class*="username"]',
    '[class*="nickname"]',
    '.note-author',
    '.author-info'
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el) {
      const text = el.innerText || el.content || el.textContent
      if (text?.trim() && text.trim().length < 50 && text.trim().length > 0) {
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

  // 检测是否在悬浮层中（小红书等平台）
  const isInFloatingLayer = checkIfInFloatingLayer()
  console.log('Is in floating layer:', isInFloatingLayer)

  // 如果在悬浮层中，优先提取悬浮层内容
  if (isInFloatingLayer) {
    const floatingContent = extractFloatingLayerContent(clone)
    if (floatingContent) {
      return floatingContent
    }
  }

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

// 检测是否在悬浮层中
function checkIfInFloatingLayer() {
  const url = window.location.href.toLowerCase()

  // 小红书悬浮层检测
  if (url.includes('xiaohongshu.com')) {
    // 检测常见的悬浮层特征
    const floatingSelectors = [
      '[class*="note-detail"]',
      '[class*="drawer"]',
      '[class*="modal"]',
      '[class*="popup"]',
      '[class*="overlay"]',
      '[class*="layer"]',
      '.note-content-wrapper',
      '.note-detail-container'
    ]

    for (const sel of floatingSelectors) {
      const elements = document.querySelectorAll(sel)
      for (const el of elements) {
        const rect = el.getBoundingClientRect()
        // 悬浮层通常比较大，覆盖大部分屏幕
        if (rect.width > 300 && rect.height > 400) {
          // 检查是否可见
          const style = window.getComputedStyle(el)
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            return true
          }
        }
      }
    }

    // 检测是否有覆盖层
    const overlay = document.querySelector('.xgplayer-overlay, [class*="overlay"], [class*="modal"]')
    if (overlay) {
      const rect = overlay.getBoundingClientRect()
      if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
        return true
      }
    }
  }

  return false
}

// 提取悬浮层内容
function extractFloatingLayerContent(clone) {
  const url = window.location.href.toLowerCase()

  // 小红书悬浮层提取
  if (url.includes('xiaohongshu.com')) {
    const xiaohongshuSelectors = [
      // 悬浮层容器
      '[class*="note-detail"]',
      '[class*="note_content"]',
      '[class*="detail-container"]',
      '[class*="content-wrapper"]',
      '.note-content',
      '.note-detail-container',
      // 文章内容区域
      '[class*="main-content"]',
      '[class*="article-content"]',
      '[class*="post-text"]',
      '.rich-text',
      '.content-wrap',
      // 可能包含内容的容器
      '.detail-wrapper',
      '.content-wrapper',
      '.note-wrapper'
    ]

    for (const sel of xiaohongshuSelectors) {
      const el = clone.querySelector(sel)
      if (el) {
        const text = el.innerText?.trim() || ''
        // 小红书帖子通常有较多文字
        if (text.length > 100 && text.length < 50000) {
          console.log('Found Xiaohongshu floating layer content:', sel, text.substring(0, 100))
          return cleanExtractedText(el)
        }
      }
    }

    // 如果没有找到，尝试找到包含标题和正文的最大元素
    // 小红书帖子通常有标题在 h1/h2 或 strong 中
    const titleEl = clone.querySelector('h1, h2, [class*="title"], [class*="header"]')
    if (titleEl) {
      // 查找标题后面的段落内容
      let contentEl = titleEl.parentElement
      while (contentEl && contentEl !== clone) {
        const siblings = contentEl.querySelectorAll('p, div, span')
        let totalText = ''
        siblings.forEach(sib => {
          totalText += sib.innerText?.trim() || ''
        })
        if (totalText.length > 200) {
          return cleanExtractedText(contentEl)
        }
        contentEl = contentEl.parentElement
      }
    }
  }

  return null
}

// 清理提取的文本
function cleanExtractedText(element) {
  const tempDiv = document.createElement('div')
  tempDiv.appendChild(element.cloneNode(true))

  // 移除不需要的元素
  tempDiv.querySelectorAll('style, script, iframe, img, video, audio, nav, header, footer').forEach(el => el.remove())

  // 获取纯文本
  let text = tempDiv.innerText || ''

  // 清理空白
  text = text.replace(/\s+/g, ' ').trim()

  // 限制在 15000 字符内
  if (text.length > 15000) {
    text = text.substring(0, 15000) + '...'
  }

  return text
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
    extractContent({ enableOcr: request.enableOcr || false }).then(content => {
      sendResponse(content)
    })
    return true // 异步响应
  }

  if (request.action === 'extractWithOcr') {
    // 返回内容，告诉 popup 我们需要 OCR
    extractContent().then(content => {
      sendResponse({
        ...content,
        needOcr: true
      })
    })
    return true
  }

  if (request.action === 'doOcr') {
    // 执行 OCR
    const useOcr = request.useOcr !== false

    // CSP 受限平台直接返回不支持
    if (isOnCspRestrictedPlatform()) {
      sendResponse({
        ocrText: '',
        error: '当前平台安全策略限制，无法使用 OCR 功能',
        cspBlocked: true
      })
      return
    }

    extractImagesText(useOcr)
      .then(text => {
        sendResponse({ ocrText: text })
      })
      .catch(error => {
        sendResponse({ ocrText: '', error: error.message })
      })
    return true // 异步响应
  }
})
