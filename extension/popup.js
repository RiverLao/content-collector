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

// 添加日志
function addLog(message, type = 'info') {
  const logsEl = document.getElementById('debugLogs')
  if (!logsEl) return

  const entry = document.createElement('div')
  entry.className = 'log-entry'
  
  const time = new Date().toLocaleTimeString()
  const colorClass = type === 'error' ? 'log-error' : ''
  
  entry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="${colorClass}">${message}</span>
  `
  
  logsEl.appendChild(entry)
  logsEl.scrollTop = logsEl.scrollHeight
  
  // 如果是错误，自动显示日志区域
  if (type === 'error') {
    logsEl.classList.add('visible')
  }
}

// 提取当前页面内容
async function extractCurrentPage() {
  addLog('开始提取页面内容...')
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) throw new Error('未找到当前标签页')

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' })
    if (!response) throw new Error('提取内容为空')

    currentContent = response
    updatePageInfo(response)
    hideStatus()
    document.getElementById('saveBtn').disabled = false
    document.getElementById('retryBtn').style.display = 'none'
    addLog('页面提取成功: ' + response.title)
  } catch (error) {
    console.error('提取失败:', error)
    addLog('提取失败: ' + error.message, 'error')
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
  
  addLog('开始保存流程...')

  const autoSummarize = document.getElementById('autoSummarize').checked
  const backendUrl = getBackendUrl()
  addLog('后端地址: ' + backendUrl)

  try {
    // 如果选择自动总结，先调用总结 API
    let aiSummary = null
    if (autoSummarize && currentContent.content) {
      showStatus('正在生成 AI 总结...', 'loading')
      addLog('正在请求 AI 总结...')

      try {
        const summarizeResponse = await fetch(`${backendUrl}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // 携带 Cookie
          body: JSON.stringify({
            content: currentContent.content.substring(0, 10000)
          })
        })

        if (!summarizeResponse.ok) {
          const errorText = await summarizeResponse.text()
          addLog(`AI 总结请求失败: ${summarizeResponse.status} ${summarizeResponse.statusText}\n${errorText}`, 'error')
        } else {
          const summarizeData = await summarizeResponse.json()
          aiSummary = summarizeData.summary
          addLog('AI 总结生成成功')
        }
      } catch (e) {
        console.error('AI 总结失败:', e)
        addLog('AI 总结网络/解析错误: ' + e.message, 'error')
        // 继续保存，不影响主流程
      }
    }

    // 保存内容
    showStatus('正在保存...', 'loading')
    addLog('正在提交内容保存请求...')

    const saveResponse = await fetch(`${backendUrl}/api/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // 携带 Cookie
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
      const errorText = await saveResponse.text()
      let errorMsg = '保存失败'
      try {
        const errorJson = JSON.parse(errorText)
        errorMsg = errorJson.error || errorMsg
      } catch (e) {
        errorMsg = errorText || `HTTP ${saveResponse.status}`
      }
      
      throw new Error(`${saveResponse.status} ${saveResponse.statusText}: ${errorMsg}`)
    }

    addLog('保存成功！')
    showStatus('保存成功！', 'success')
    saveBtn.textContent = '已保存'

    // 3秒后刷新内容
    setTimeout(() => {
      extractCurrentPage()
    }, 3000)

  } catch (error) {
    console.error('保存失败:', error)
    addLog('保存流程中止: ' + error.message, 'error')
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
