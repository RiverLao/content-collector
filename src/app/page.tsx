'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ContentCard,
  ExtractedContentModal
} from './components'
import { Content, ExtractResult } from '@/types'
import { Header } from '@/components/Header'
import { SettingsPanel } from '@/components/SettingsPanel'
import { DEFAULT_PROMPT } from '@/lib/deepseek'

// 筛选类型
type FilterType = 'inbox' | 'favorites' | 'trash'

export default function Home() {
  // 数据状态
  const [contents, setContents] = useState<Content[]>([])
  const [extractedContent, setExtractedContent] = useState<ExtractResult | null>(null)

  // 筛选状态
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [currentFilter, setCurrentFilter] = useState<FilterType>('inbox')

  // 当前使用的提示词
  const [currentPromptId, setCurrentPromptId] = useState('default')
  const [currentPrompt, setCurrentPrompt] = useState(DEFAULT_PROMPT)

  // 设置面板状态
  const [showSettings, setShowSettings] = useState(false)

  // 所有标签（从内容中提取）
  const allTags = Array.from(
    new Set(contents.flatMap(c => c.tags || []))
  ).sort()

  // 计算收藏数量
  const favoriteCount = contents.filter(c => c.is_favorite).length

  // 计算回收站数量
  const trashCount = contents.filter(c => c.is_deleted).length

  // 加载内容列表
  const fetchContents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedTags.length > 0) {
        // OR 逻辑：只取第一个标签进行筛选
        params.set('tag', selectedTags[0])
      }
      if (currentFilter === 'favorites') {
        params.set('favorite', 'true')
      } else if (currentFilter === 'trash') {
        params.set('deleted', 'true')
      } else {
        params.set('deleted', 'false')
      }

      const response = await fetch(`/api/contents?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setContents(data.contents || [])
      }
    } catch (error) {
      console.error('获取内容失败:', error)
    }
  }, [search, selectedTags, currentFilter])

  useEffect(() => {
    fetchContents()
  }, [fetchContents, search, selectedTags, currentFilter])

  // 从本地加载提示词
  useEffect(() => {
    const saved = localStorage.getItem('system_prompt')
    if (saved) {
      setCurrentPrompt(saved)
    }
  }, [])

  // 保存内容
  const handleSave = async (data: {
    tags: string[]
    aiSummary?: string
    manualContent?: string
  }) => {
    if (!extractedContent) return

    const rawContent = data.manualContent || extractedContent.content

    try {
      const response = await fetch('/api/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: extractedContent.url,
          title: extractedContent.title,
          platform: extractedContent.platform,
          raw_content: rawContent,
          ai_summary: data.aiSummary,
          summary_prompt: currentPrompt,
          tags: data.tags
        })
      })

      if (response.ok) {
        fetchContents()
      } else {
        const error = await response.json()
        throw new Error(error.error || '保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      alert(error instanceof Error ? error.message : '保存失败')
    }
  }

  // 删除内容（软删除）
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条内容吗？')) return

    try {
      const response = await fetch(`/api/contents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: true })
      })

      if (response.ok) {
        setContents(contents.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  // 切换收藏状态
  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      const response = await fetch(`/api/contents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite })
      })

      if (response.ok) {
        setContents(contents.map(c =>
          c.id === id ? { ...c, is_favorite: isFavorite } : c
        ))
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
    }
  }

  // 更新标签
  const handleUpdateTags = async (id: string, tags: string[]) => {
    try {
      const response = await fetch(`/api/contents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      })

      if (response.ok) {
        setContents(contents.map(c =>
          c.id === id ? { ...c, tags } : c
        ))
      }
    } catch (error) {
      console.error('更新标签失败:', error)
    }
  }

  // AI 总结
  const handleSummarize = async (id: string) => {
    const content = contents.find(c => c.id === id)
    if (!content?.raw_content) {
      alert('没有原文内容，无法总结')
      return
    }

    if (!confirm('确定要生成 AI 总结吗？')) return

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.raw_content.substring(0, 10000),
          custom_prompt: currentPrompt
        })
      })

      if (!response.ok) {
        throw new Error('总结失败')
      }

      const data = await response.json()

      // 更新总结到数据库
      const updateResponse = await fetch(`/api/contents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_summary: data.summary })
      })

      if (updateResponse.ok) {
        setContents(contents.map(c =>
          c.id === id ? { ...c, ai_summary: data.summary } : c
        ))
        alert('AI 总结生成成功！')
      }
    } catch (error) {
      console.error('总结失败:', error)
      alert('总结失败，请重试')
    }
  }

  // 更新原文内容
  const handleEditContent = async (id: string, newContent: string) => {
    try {
      const response = await fetch(`/api/contents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_content: newContent })
      })

      if (response.ok) {
        setContents(contents.map(c =>
          c.id === id ? { ...c, raw_content: newContent } : c
        ))
      } else {
        throw new Error('更新失败')
      }
    } catch (error) {
      console.error('更新内容失败:', error)
      alert('更新失败，请重试')
    }
  }

  /**
   * 过滤逻辑说明：
   *
   * OR 逻辑（当前使用）：只要文章包含任意一个选中的标签就会显示
   * const filteredContents = contents.filter(content =>
   *   selectedTags.length === 0 ||
   *   selectedTags.some(tag => content.tags?.includes(tag))
   * )
   *
   * AND 逻辑：文章必须包含所有选中的标签才会显示
   * const filteredContents = contents.filter(content =>
   *   selectedTags.length === 0 ||
   *   selectedTags.every(tag => content.tags?.includes(tag))
   * )
   */
  const filteredContents = contents.filter(content => {
    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        content.title?.toLowerCase().includes(searchLower) ||
        content.ai_summary?.toLowerCase().includes(searchLower) ||
        content.url?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // 标签过滤 - OR 逻辑（包含任意一个选中标签即显示）
    if (selectedTags.length > 0) {
      const contentTags = content.tags || []
      return selectedTags.some(tag => contentTags.includes(tag))
    }

    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <Header
        onOpenSettings={() => setShowSettings(true)}
        searchValue={search}
        onSearchChange={setSearch}
        allTags={allTags}
        selectedTags={selectedTags}
        onSelectTags={setSelectedTags}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 左侧导航栏 */}
          <nav className="w-48 flex-shrink-0 space-y-1">
            {/* 收件箱 */}
            <button
              onClick={() => setCurrentFilter('inbox')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentFilter === 'inbox'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              收件箱
              <span className="ml-auto text-xs bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full">
                {contents.filter(c => !c.is_deleted).length}
              </span>
            </button>

            {/* 星标收藏 */}
            <button
              onClick={() => setCurrentFilter('favorites')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentFilter === 'favorites'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              星标收藏
              <span className="ml-auto text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded-full">
                {favoriteCount}
              </span>
            </button>

            {/* 回收站 */}
            <button
              onClick={() => setCurrentFilter('trash')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentFilter === 'trash'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              回收站
              <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                {trashCount}
              </span>
            </button>

            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                标签管理
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allTags.slice(0, 10).map(tag => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTags(prev => prev.filter(t => t !== tag))
                        } else {
                          setSelectedTags(prev => [...prev, tag])
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {tag}
                    </button>
                  )
                })}
                {allTags.length > 10 && (
                  <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    查看全部 ({allTags.length})
                  </button>
                )}
              </div>
            </div>
          </nav>

          {/* 右侧：内容列表 */}
          <section className="flex-1 min-w-0">
            {/* 如果没有内容，显示空状态；如果有内容但筛选后为空，显示筛选结果 */}
            {(contents.length === 0) ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  还没有收藏内容
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  使用浏览器插件保存网页内容
                </p>
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  没有匹配的内容
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  尝试调整筛选条件
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContents.map(content => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onDelete={handleDelete}
                    onUpdateTags={handleUpdateTags}
                    onSummarize={handleSummarize}
                    onEditContent={handleEditContent}
                    onToggleFavorite={handleToggleFavorite}
                    allTags={allTags}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 提取结果弹窗 */}
      {extractedContent && (
        <ExtractedContentModal
          result={extractedContent}
          onClose={() => setExtractedContent(null)}
          onSave={handleSave}
        />
      )}

      {/* 设置面板 */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSavePrompt={(prompt) => setCurrentPrompt(prompt)}
      />
    </div>
  )
}
