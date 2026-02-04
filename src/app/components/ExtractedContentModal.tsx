'use client'

import { useState, useEffect } from 'react'
import { ExtractResult, SummarizeResult } from '@/types'

interface ExtractedContentModalProps {
  result: ExtractResult
  onClose: () => void
  onSave: (data: { tags: string[]; aiSummary?: string; manualContent?: string }) => void
}

export function ExtractedContentModal({
  result,
  onClose,
  onSave
}: ExtractedContentModalProps) {
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [summaryError, setSummaryError] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'preview' | 'manual'>('preview')
  const [manualContent, setManualContent] = useState('')

  // 如果自动提取的内容为空，默认显示手动输入
  useEffect(() => {
    if (!result.content.trim()) {
      setActiveTab('manual')
    }
  }, [result.content])

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleSummarize = async (content: string) => {
    if (!content.trim()) {
      setSummaryError('请输入要总结的内容')
      return
    }

    setIsSummarizing(true)
    setSummaryError('')

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.substring(0, 10000) // 限制内容长度
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '总结失败')
      }

      const data: SummarizeResult = await response.json()
      setAiSummary(data.summary)
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : '总结失败')
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleSave = () => {
    onSave({
      tags,
      aiSummary: aiSummary || undefined,
      manualContent: activeTab === 'manual' ? manualContent : undefined
    })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag()
    }
  }

  // 实际用于总结的内容
  const contentForSummary = activeTab === 'manual' ? manualContent : result.content
  const canSummarize = contentForSummary.trim().length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden
                      flex flex-col shadow-xl">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">内容预览</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                      ${activeTab === 'preview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            自动提取
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                      ${activeTab === 'manual'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            手动输入
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 基本信息 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {result.platform}
              </span>
              {result.author && (
                <span className="text-sm text-gray-500">
                  作者: {result.author}
                </span>
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{result.title}</h3>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs
                             bg-blue-100 text-blue-700 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => setTags(tags.filter(t => t !== tag))}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="添加标签"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg
                           hover:bg-gray-200"
              >
                添加
              </button>
            </div>
          </div>

          {/* AI 总结 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                AI 总结
              </label>
              <button
                onClick={() => handleSummarize(contentForSummary)}
                disabled={isSummarizing || !canSummarize}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSummarizing ? '总结中...' : '生成总结'}
              </button>
            </div>

            {summaryError && (
              <p className="text-sm text-red-500 mb-2">{summaryError}</p>
            )}

            {aiSummary ? (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700
                            whitespace-pre-wrap max-h-60 overflow-y-auto">
                {aiSummary}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                点击"生成总结"使用 AI 自动总结内容
              </p>
            )}
          </div>

          {/* 内容区域 */}
          {activeTab === 'preview' ? (
            /* 自动提取的内容预览 */
            result.content ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原始内容预览
                </label>
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600
                              whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {result.content.substring(0, 2000)}
                  {result.content.length > 2000 && '...'}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  如内容不完整，请使用「手动输入」粘贴完整内容
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                  未能自动提取内容。部分平台（如知乎、微信公众号）可能需要手动输入。
                </p>
                <button
                  onClick={() => setActiveTab('manual')}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  切换到手动输入
                </button>
              </div>
            )
          ) : (
            /* 手动输入内容 */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                粘贴要总结的内容
              </label>
              <textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="在此粘贴文章、视频或其他内容的完整文本..."
                className="w-full h-48 px-3 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                建议粘贴 500-5000 字的完整内容，AI 总结效果最佳
              </p>
            </div>
          )}

          {/* 原文链接 */}
          <div className="pt-2 border-t border-gray-100">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 truncate block"
            >
              {result.url}
            </a>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg
                       hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg
                       hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
