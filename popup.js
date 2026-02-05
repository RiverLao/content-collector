// popup.js - 弹窗逻辑

let currentContent = null
let isSaving = false

// 获取第二大脑后端地址
function getBackendUrl() {
  // 默认使用 Vercel 线上版本
  return localStorage.getItem('backendUrl') || 'https://content-collector.vercel.app'
}

// 更新页面信息显示
function updatePageInfo(content) {
  document.getElementById('pageTitle').textContent = content.title || '无标题'
  document.getElementById('pagePlatform').textContent = getPlatformName(content.platform)
  document.getElementById('pageAuthor').textContent = content.author || '-'
}

// 显示状态
function showStatus(message, type) {
  const statusEl = document.getElementById('status')
  statusEl.textContent = message
  statusEl.className = 'status ' + type
  statusEl.style.display = 'block'
}

// 隐藏状态
function hideStatus() {
  document.getElementById('status').style.display = 'none'
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

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' })
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
    // 如果选择自动总结，先调用总结 API
    let aiSummary = null
    if (autoSummarize && currentContent.content) {
      showStatus('正在生成 AI 总结...', 'loading')

      try {
        const summarizeResponse = await fetch(`${backendUrl}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: currentContent.content.substring(0, 10000)
          })
        })

        if (summarizeResponse.ok) {
          const summarizeData = await summarizeResponse.json()
          aiSummary = summarizeData.summary
        }
      } catch (e) {
        console.error('AI 总结失败:', e)
        // 继续保存，不影响主流程
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
        raw_content: currentContent.content,
        ai_summary: aiSummary,
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
  const backendUrl = getBackendUrl()
  chrome.tabs.create({ url: backendUrl })
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

  // 提取当前页面内容
  extractCurrentPage()
})
