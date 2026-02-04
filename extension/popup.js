// popup.js - 弹窗逻辑

let currentContent = null
let ocrText = ''
let isSaving = false
let enableOcr = true

// 获取第二大脑后端地址
function getBackendUrl() {
  return localStorage.getItem('backendUrl') || 'https://content-collector.vercel.app'
}

// 更新页面信息显示
function updatePageInfo(content) {
  document.getElementById('pageTitle').textContent = content.title || '无标题'
  document.getElementById('pagePlatform').textContent = getPlatformName(content.platform)
  document.getElementById('pageAuthor').textContent = content.author || '-'
}

// 显示状态
function showStatus(message, type = 'loading') {
  const statusEl = document.getElementById('status')
  statusEl.innerHTML = message
  statusEl.className = 'status ' + type

  if (type === 'ocr') {
    statusEl.innerHTML += `
      <div class="progress-bar">
        <div class="fill" id="ocrProgress" style="width: 0%"></div>
      </div>
    `
  }

  statusEl.style.display = 'block'
}

// 隐藏状态
function hideStatus() {
  document.getElementById('status').style.display = 'none'
}

// 更新 OCR 进度
function updateOcrProgress(current, total) {
  const fill = document.getElementById('ocrProgress')
  if (fill) {
    const percent = Math.round((current / total) * 100)
    fill.style.width = percent + '%'
  }
}

// 平台名称映射
function getPlatformName(platform) {
  const names = {
    zhihu: '知乎',
    wechat: '微信公众号',
    xiaohongshu: '小红书',
    youtube: 'YouTube',
    juejin: '掘金',
    douban: '豆瓣',
    medium: 'Medium',
    weibo: '微博',
    twitter: 'Twitter',
    v2ex: 'V2EX',
    article: '文章'
  }
  return names[platform] || platform
}

// 提取当前页面内容
async function extractCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extract',
      enableOcr: enableOcr
    })

    currentContent = response
    updatePageInfo(response)
    hideStatus()
    document.getElementById('saveBtn').disabled = false
    document.getElementById('retryBtn').style.display = 'none'
  } catch (error) {
    console.error('提取失败:', error)
    showStatus('提取失败，请刷新页面后重试', 'error')
    document.getElementById('saveBtn').disabled = true
    document.getElementById('retryBtn').style.display = 'inline-block'
  }
}

// 执行 OCR 识别
async function doOcr() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  showStatus('正在识别图片文字...', 'ocr')

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'doOcr', useOcr: enableOcr })

    if (response.cspBlocked) {
      // CSP 受限平台
      showStatus('当前平台不支持 OCR（安全策略限制）', 'loading')
      return
    }

    if (response.ocrText) {
      ocrText = response.ocrText
      showStatus(`图片文字识别完成 (${response.ocrText.length} 字)`, 'success')
    } else {
      showStatus('未识别到图片文字', 'loading')
    }
  } catch (error) {
    console.error('OCR 失败:', error)
    showStatus('图片识别失败，继续保存...', 'loading')
  }
}

// 保存到第二大脑
async function saveToSecondBrain() {
  if (!currentContent || isSaving) return

  isSaving = true
  const saveBtn = document.getElementById('saveBtn')
  saveBtn.disabled = true
  saveBtn.textContent = '保存中...'

  const autoSummarize = document.getElementById('autoSummarize').checked
  const backendUrl = getBackendUrl()

  try {
    // 如果开启 OCR，先执行 OCR
    if (enableOcr) {
      await doOcr()
    }

    // 合并文本：正文 + OCR 识别结果
    const fullContent = currentContent.content + (ocrText ? '\n\n=== 图片文字 ===\n' + ocrText : '')

    let aiSummary = null

    // 只有用户选择自动总结时，才调用 AI
    if (autoSummarize && fullContent.trim()) {
      showStatus('正在生成 AI 总结...', 'loading')

      try {
        const summarizeResponse = await fetch(`${backendUrl}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: fullContent.substring(0, 10000)
          })
        })

        if (summarizeResponse.ok) {
          const summarizeData = await summarizeResponse.json()
          aiSummary = summarizeData.summary
        }
      } catch (e) {
        console.error('AI 总结失败:', e)
        // 不影响保存流程
      }
    }

    // 保存内容
    showStatus('正在保存...', 'loading')

    const saveResponse = await fetch(`${backendUrl}/api/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentContent.url,
        title: currentContent.title,
        platform: currentContent.platform,
        raw_content: fullContent,
        ai_summary: aiSummary,
        summary_prompt: '',
        tags: []
      })
    })

    if (!saveResponse.ok) {
      const errorData = await saveResponse.json()
      throw new Error(errorData.error || '保存失败')
    }

    showStatus('保存成功！', 'success')
    saveBtn.textContent = '已保存'

    // 3秒后刷新内容
    setTimeout(() => {
      ocrText = ''
      extractCurrentPage()
    }, 3000)

  } catch (error) {
    console.error('保存失败:', error)
    showStatus('保存失败: ' + error.message, 'error')
    saveBtn.disabled = false
    saveBtn.textContent = '重新保存'
  } finally {
    isSaving = false
  }
}

// 打开第二大脑网页
function openSecondBrain() {
  // 直接跳转到 Vercel，不走 localStorage
  chrome.tabs.create({ url: 'https://content-collector.vercel.app' })
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 绑定事件
  document.getElementById('saveBtn').addEventListener('click', saveToSecondBrain)
  document.getElementById('retryBtn').addEventListener('click', extractCurrentPage)
  document.getElementById('openApp').addEventListener('click', (e) => {
    e.preventDefault()
    openSecondBrain()
  })

  // OCR 开关
  const ocrToggle = document.getElementById('ocrToggle')
  const enableOcrCheckbox = document.getElementById('enableOcr')

  function updateOcrToggle() {
    enableOcr = enableOcrCheckbox.checked
    if (enableOcr) {
      ocrToggle.classList.add('active')
    } else {
      ocrToggle.classList.remove('active')
    }
  }

  ocrToggle.addEventListener('click', () => {
    enableOcrCheckbox.checked = !enableOcrCheckbox.checked
    updateOcrToggle()
  })

  enableOcrCheckbox.addEventListener('change', updateOcrToggle)
  updateOcrToggle() // 初始化状态

  // 监听 OCR 进度
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'ocrProgress') {
      updateOcrProgress(message.current, message.total)
    }
  })

  // 提取当前页面内容
  extractCurrentPage()
})
