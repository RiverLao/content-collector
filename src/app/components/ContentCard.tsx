'use client'

import { useState, useRef, useEffect } from 'react'
import { Content } from '@/types'
import { platformIcons, platformNames } from '@/lib/extractors/extractor'
import { EditorDrawer } from '@/components/EditorDrawer'

interface ContentCardProps {
  content: Content
  onDelete: (id: string) => void
  onUpdateTags: (id: string, tags: string[]) => void
  onSummarize: (id: string) => void
  onEditContent: (id: string, newContent: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
  allTags: string[]
}

export function ContentCard({
  content,
  onDelete,
  onUpdateTags,
  onSummarize,
  onEditContent,
  onToggleFavorite,
  allTags
}: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [rawContent, setRawContent] = useState(content.raw_content || '')
  const [copiedRaw, setCopiedRaw] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [showEditorDrawer, setShowEditorDrawer] = useState(false)
  const rawContentRef = useRef<HTMLDivElement>(null)
  const [editorFontSize, setEditorFontSize] = useState(16)

  const platform = content.platform || 'link'
  const tags = content.tags || []
  const aiSummary = content.ai_summary || ''
  const isFavorite = content.is_favorite === true

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onUpdateTags(content.id, [...tags, newTag.trim()])
      setNewTag('')
      setShowTagInput(false)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateTags(content.id, tags.filter(t => t !== tagToRemove))
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 相对时间格式化
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    if (days < 365) return `${Math.floor(days / 30)}个月前`

    return `${Math.floor(days / 365)}年前`
  }

  // 完整时间（用于 tooltip）
  const formatFullTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string, type: 'raw' | 'summary') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'raw') {
        setCopiedRaw(true)
        setTimeout(() => setCopiedRaw(false), 2000)
      } else {
        setCopiedSummary(true)
        setTimeout(() => setCopiedSummary(false), 2000)
      }
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 获取纯文本内容（用于复制）
  const getRawTextContent = () => {
    if (rawContentRef.current) {
      return rawContentRef.current.innerText
    }
    return rawContent
  }

  // 富文本操作
  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value)
    rawContentRef.current?.focus()
  }

  // 获取选中的文字大小
  const getSelectionFontSize = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const span = range.commonAncestorContainer.parentElement
      if (span) {
        const fontSize = span.style.fontSize
        if (fontSize) {
          return parseInt(fontSize)
        }
      }
    }
    return editorFontSize
  }

  // 插入高亮
  const highlightSelection = (color: string) => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0)
      if (range.commonAncestorContainer.parentElement?.closest('.editor')) {
        const span = document.createElement('span')
        span.style.backgroundColor = color
        span.dataset.highlight = 'true'
        range.surroundContents(span)
      }
    }
  }

  // 插入字体颜色
  const colorSelection = (color: string) => {
    document.execCommand('foreColor', false, color)
  }

  // 保存编辑后的内容
  const handleSaveContent = async () => {
    const newContent = rawContentRef.current?.innerText || ''
    try {
      const response = await fetch(`/api/contents/${content.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_content: newContent })
      })

      if (response.ok) {
        setRawContent(newContent)
        alert('保存成功！')
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请重试')
    }
  }

  // 插入字体大小
  const sizeSelection = (size: number) => {
    document.execCommand('fontSize', false, '3')
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const span = range.commonAncestorContainer.parentElement
      if (span && span.tagName === 'FONT') {
        span.style.fontSize = `${size}px`
        span.removeAttribute('size')
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* 头部信息 */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{platformIcons[platform] || '🔗'}</span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {platformNames[platform] || platform}
              </span>
              <span
                className="text-xs text-gray-400"
                title={formatFullTime(content.created_at)}
              >
                {formatRelativeTime(content.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* 收藏按钮 */}
              <button
                onClick={() => onToggleFavorite(content.id, !isFavorite)}
                className={`text-xl transition-colors flex-shrink-0 ${isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                title={isFavorite ? '取消收藏' : '收藏'}
              >
                {isFavorite ? '★' : '☆'}
              </button>
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium text-gray-900 hover:text-blue-600 line-clamp-2 transition-colors"
              >
                {content.title || '无标题'}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* 添加标签按钮 */}
            <div className="relative">
              <button
                onClick={() => setShowTagInput(!showTagInput)}
                className={`p-1.5 rounded-lg transition-colors ${showTagInput ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                title="添加标签"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>

              {/* 标签输入框 */}
              {showTagInput && (
                <div className="absolute right-0 top-full mt-2 z-10 flex items-center gap-1 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="标签名"
                    className="w-24 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
                    autoFocus
                  />
                  <button
                    onClick={handleAddTag}
                    className="p-1 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* AI 总结按钮 */}
            {!aiSummary && (
              <button
                onClick={() => onSummarize(content.id)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="生成 AI 总结"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
            )}

            <button
              onClick={() => onDelete(content.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 原文部分 */}
      {rawContent && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              原文 {showRaw ? '▼' : '▶'}
            </span>
            <span className="text-xs text-gray-400">
              {rawContent.length} 字
            </span>
          </button>

          {showRaw && (
            <div className="px-4 pb-4">
              {/* 原文预览（只读） */}
              <div className="text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-50">
                {rawContent}
              </div>

              {/* 打开编辑器按钮 */}
              <button
                onClick={() => setShowEditorDrawer(true)}
                className="mt-3 w-full py-2 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                查看/编辑原文
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI 总结部分 */}
      {aiSummary && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              AI 总结 {isExpanded ? '▼' : '▶'}
            </span>
            {isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(aiSummary, 'summary')
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="复制总结"
              >
                {copiedSummary ? (
                  <>
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">已复制</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制
                  </>
                )}
              </button>
            )}
          </button>

          {isExpanded && (
            <div className="px-4 pb-4">
              <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {aiSummary}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 底部工具栏 */}
      <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex items-center justify-between">
        {/* 域名标签 */}
        <span className="text-xs text-gray-400 truncate max-w-[200px]" title={content.url}>
          {content.url ? new URL(content.url).hostname : '链接'}
        </span>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              navigator.clipboard.writeText(content.url)
              alert('链接已复制')
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="复制链接"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="打开链接"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* 编辑抽屉 */}
      <EditorDrawer
        content={content}
        isOpen={showEditorDrawer}
        onClose={() => setShowEditorDrawer(false)}
        onSave={(id, newContent) => {
          setRawContent(newContent)
          onEditContent(id, newContent)
        }}
      />
    </div>
  )
}
