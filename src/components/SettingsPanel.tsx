'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { DEFAULT_PROMPT } from '@/lib/deepseek'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onSavePrompt?: (prompt: string) => void
}

export function SettingsPanel({ isOpen, onClose, onSavePrompt }: SettingsPanelProps) {
  const [systemPrompt, setSystemPrompt] = useState('')
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

      // 通知父组件
      onSavePrompt?.(systemPrompt)

      // 尝试保存到服务器
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
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      <div
        ref={panelRef}
        className="w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
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

        {/* 内容 */}
        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 主题设置 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">外观</h4>
            <ThemeToggle />
          </div>

          {/* AI 总结提示词 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">AI 总结提示词</h4>
            <textarea
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value)
                setSaved(false)
              }}
              className="w-full h-40 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2 mt-3">
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
            </div>
          </div>

          {/* 示例 */}
          <div>
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
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
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
          ${theme === 'light' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
        title="日间模式"
      >
        ☀️
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
          ${theme === 'dark' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
        title="夜间模式"
      >
        🌙
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
          ${theme === 'system' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
        title="跟随系统"
      >
        💻
      </button>
    </div>
  )
}
