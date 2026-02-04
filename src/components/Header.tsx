'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  onOpenSettings: () => void
  searchValue: string
  onSearchChange: (value: string) => void
  allTags: string[]
  selectedTags: string[]
  onSelectTags: (tags: string[] | ((prev: string[]) => string[])) => void
}

export function Header({ onOpenSettings, searchValue, onSearchChange, allTags, selectedTags, onSelectTags }: HeaderProps) {
  const [user, setUser] = useState<any>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setShowMenu(false)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 左侧：Logo */}
          <div className="flex items-center gap-3">
            <a href="/" className="block">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">第二大脑</h1>
            </a>
          </div>

          {/* 中间：搜索框 */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="搜索标题或总结..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg
                           bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                           placeholder:text-gray-400"
              />
            </div>

            {/* 标签快捷筛选 - 多选模式 */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                {/* "全部" 按钮 - 清空选择 */}
                <button
                  onClick={() => onSelectTags([])}
                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                    selectedTags.length === 0
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  全部
                </button>

                {/* 标签列表 - 始终显示，不会消失 */}
                {allTags.map(tag => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        if (isSelected) {
                          // 从选中列表中移除
                          onSelectTags(selectedTags.filter(t => t !== tag))
                        } else {
                          // 添加到选中列表
                          onSelectTags([...selectedTags, tag])
                        }
                      }}
                      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}

                {/* 清除筛选按钮 */}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => onSelectTags([])}
                    className="px-2 py-0.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    title="清除筛选"
                  >
                    清除
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 右侧：用户菜单 */}
          <div className="relative" ref={menuRef}>
            {loading ? (
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse"></div>
            ) : user ? (
              <>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        onOpenSettings()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      设置
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      退出登录
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href="/login"
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  登录
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
