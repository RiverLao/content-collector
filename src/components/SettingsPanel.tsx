'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { DEFAULT_PROMPT } from '@/lib/deepseek'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onSavePrompt?: (prompt: string) => void
}

type SettingsTab = 'general' | 'ai' | 'data'

export function SettingsPanel({ isOpen, onClose, onSavePrompt }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // 加载保存的提示词
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('system_prompt')
      setSystemPrompt(saved || DEFAULT_PROMPT)
      setSaved(false)
      setShowPromptEditor(false)
    }
  }, [isOpen])

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem('system_prompt', systemPrompt)
      setSaved(true)
      onSavePrompt?.(systemPrompt)

      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'system_prompt', value: systemPrompt })
        })
      } catch (e) {
        console.log('提示词已保存到本地')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSystemPrompt(DEFAULT_PROMPT)
    localStorage.setItem('system_prompt', DEFAULT_PROMPT)
    onSavePrompt?.(DEFAULT_PROMPT)
    setSaved(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 设置面板 */}
      <div
        ref={panelRef}
        className="relative w-[600px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">设置</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 主体：左右两栏布局 */}
        <div className="flex">
          {/* 左侧导航 */}
          <div className="w-36 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700 py-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                activeTab === 'general'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium border-r-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              通用
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                activeTab === 'ai'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium border-r-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              AI 配置
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                activeTab === 'data'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium border-r-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              数据管理
            </button>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 p-4 max-h-[60vh] overflow-y-auto">
            {/* 通用 */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* 外观主题 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    外观主题
                  </label>
                  <div className="flex gap-2">
                    <ThemeButton value="light" label="☀️ 日间" />
                    <ThemeButton value="dark" label="🌙 夜间" />
                    <ThemeButton value="system" label="💻 跟随系统" />
                  </div>
                </div>

                {/* 阅读设置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    阅读设置
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">字号</label>
                      <select className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>小 (14px)</option>
                        <option>中 (16px)</option>
                        <option selected>大 (18px)</option>
                        <option>特大 (20px)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">字体</label>
                      <select className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>系统默认</option>
                        <option>衬线体</option>
                        <option>无衬线体</option>
                        <option>等宽字体</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI 配置 */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                {/* 模型选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    模型选择
                  </label>
                  <select className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Deepseek Chat</option>
                    <option>Deepseek Reasoner</option>
                    <option>GPT-4</option>
                    <option>Claude 3</option>
                  </select>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 总结语言 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    总结语言
                  </label>
                  <select className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>中文</option>
                    <option>English</option>
                    <option>日本語</option>
                  </select>
                </div>

                {/* 自定义提示词 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    自定义提示词
                  </label>
                  {!showPromptEditor ? (
                    <button
                      onClick={() => setShowPromptEditor(true)}
                      className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      点击展开编辑...
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => {
                          setSystemPrompt(e.target.value)
                          setSaved(false)
                        }}
                        className="w-full h-48 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="请输入系统提示词..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          {saving ? '保存中...' : saved ? '已保存' : '保存'}
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          重置默认
                        </button>
                        <button
                          onClick={() => setShowPromptEditor(false)}
                          className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                        >
                          收起
                        </button>
                      </div>
                      {/* 示例 */}
                      <div>
                        <button
                          onClick={() => setShowExamples(!showExamples)}
                          className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          {showExamples ? '收起示例' : '查看示例'}
                        </button>
                        {showExamples && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-600 dark:text-gray-400 space-y-2">
                            <p className="font-medium text-gray-700 dark:text-gray-300">示例 1（要点提炼）：</p>
                            <pre className="whitespace-pre-wrap font-sans">请用简洁的要点格式总结以下内容，列出最重要的 3-5 个核心观点。</pre>
                            <p className="font-medium text-gray-700 dark:text-gray-300 mt-2">示例 2（学习笔记）：</p>
                            <pre className="whitespace-pre-wrap font-sans">请以学习笔记的格式总结，包含：核心概念、关键要点、个人思考。</pre>
                            <p className="font-medium text-gray-700 dark:text-gray-300 mt-2">示例 3（行动计划）：</p>
                            <pre className="whitespace-pre-wrap font-sans">请总结可执行的行动步骤，列出具体的待办事项。</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 数据管理 */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                {/* 导出数据 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    导出数据
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      Markdown
                    </button>
                    <button className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      JSON
                    </button>
                    <button className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      Word
                    </button>
                    <button className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      PDF
                    </button>
                  </div>
                </div>

                {/* 清空缓存 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    清空缓存
                  </label>
                  <button className="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                    清空所有数据
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ThemeButton({ value, label }: { value: string; label: string }) {
  const { theme, setTheme } = useTheme()
  const isActive = theme === value

  return (
    <button
      onClick={() => setTheme(value)}
      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  )
}
