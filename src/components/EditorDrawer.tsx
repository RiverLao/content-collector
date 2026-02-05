'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Content } from '@/types'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontSize } from '@tiptap/extension-text-style'

interface EditorDrawerProps {
  content: Content
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, newContent: string) => void
}

export function EditorDrawer({ content, isOpen, onClose, onSave }: EditorDrawerProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editorFontSize, setEditorFontSize] = useState(16)
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    color: null as string | null,
    fontSize: null as string | null,
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      TextStyle,
      Color,
      FontSize.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: content.raw_content || '',
    immediatelyRender: false,
  })

  // 获取当前选中文字的样式状态
  const getActiveStyles = useCallback(() => {
    if (!editor) {
      return { bold: false, italic: false, underline: false, color: null, fontSize: null }
    }

    return {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      color: editor.getAttributes('textStyle').color || null,
      fontSize: editor.getAttributes('textStyle').fontSize || null,
    }
  }, [editor])

  // 更新选中样式状态
  const updateActiveStyles = useCallback(() => {
    if (!editor) return
    setActiveStyles({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      color: editor.getAttributes('textStyle').color || null,
      fontSize: editor.getAttributes('textStyle').fontSize || null,
    })
  }, [editor])

  // 监听编辑器事件更新样式状态
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => updateActiveStyles()
    const handleSelectionUpdate = () => updateActiveStyles()

    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleSelectionUpdate)

    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor, updateActiveStyles])

  // 加载内容
  useEffect(() => {
    if (isOpen && editor && content.raw_content) {
      const currentContent = editor.getHTML()
      if (currentContent !== content.raw_content) {
        editor.commands.setContent(content.raw_content)
      }
    }
  }, [isOpen, editor, content.raw_content])

  // 按 ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // 获取当前字号（显示在按钮上）
  const currentFontSize = useMemo(() => {
    if (!editor) return editorFontSize

    // 先检查是否有选中范围
    const { from, to } = editor.state.selection
    if (from === to) {
      // 没有选中文字，返回默认字号
      return editorFontSize
    }

    // 获取选中文字的样式，检测内联样式
    const { $from } = editor.state.selection
    let fontSize = null as string | null

    // 遍历选中范围内的节点
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          // 检查是否是 inline 样式的 font-size
          if (mark.type.name === 'textStyle' && mark.attrs.fontSize) {
            fontSize = mark.attrs.fontSize
          }
        })
      }
      // 检查节点本身的 style
      if (node.type.name === 'text' && node.text) {
        // 这里无法直接获取样式，使用 getAttributes
      }
    })

    // 也尝试使用 editor 的 getAttributes
    const attrs = editor.getAttributes('textStyle')
    if (attrs.fontSize) {
      return parseInt(attrs.fontSize)
    }

    return fontSize ? parseInt(fontSize) : editorFontSize
  }, [editor, editorFontSize])

  // 设置字号（针对选中文字）
  const setFontSize = useCallback((size: number) => {
    if (!editor) return
    const sizeStr = `${size}px`

    // 使用 Tiptap 的 fontSize 扩展命令
    editor.chain().focus().setFontSize(sizeStr).run()

    // 更新状态
    setActiveStyles(prev => ({ ...prev, fontSize: sizeStr }))
    setEditorFontSize(size)
  }, [editor])

  // 设置颜色（针对选中文字）
  const setColor = useCallback((color: string) => {
    if (!editor) return

    // 使用 Tiptap 的 mark 命令
    editor.chain().focus().setMark('textStyle', { color }).run()

    // 更新状态
    setActiveStyles(prev => ({ ...prev, color }))
  }, [editor])

  // 复制内容
  const copyContent = useCallback(async () => {
    const text = editor?.getText() || ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }, [editor])

  // 保存内容
  const handleSave = useCallback(async () => {
    if (!editor) return

    setIsSaving(true)
    try {
      const html = editor.getHTML()
      await onSave(content.id, html)
    } finally {
      setIsSaving(false)
    }
  }, [editor, content.id, onSave])

  if (!isOpen) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              编辑原文
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
              {content.title}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyContent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  已复制
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  复制
                </>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          {/* 字号 */}
          <div className="flex items-center gap-1 mr-3">
            <button
              onClick={() => setFontSize(Math.max(12, currentFontSize - 2))}
              className="w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="缩小选中文字"
            >
              <span className="text-sm font-bold">A-</span>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-center">
              {currentFontSize}px
            </span>
            <button
              onClick={() => setFontSize(Math.min(32, currentFontSize + 2))}
              className="w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="放大选中文字"
            >
              <span className="text-sm font-bold">A+</span>
            </button>
          </div>

          <div className="w-px h-7 bg-gray-300 dark:bg-gray-600 mx-1"></div>

          {/* 文字格式 */}
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors font-bold ${
              activeStyles.bold
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="加粗"
          >
            B
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors italic ${
              activeStyles.italic
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="斜体"
          >
            I
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors underline ${
              activeStyles.underline
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="下划线"
          >
            U
          </button>

          <div className="w-px h-7 bg-gray-300 dark:bg-gray-600 mx-1"></div>

          {/* 高亮 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">高亮</span>
            {['#fef08a', '#86efac', '#93c5fd', '#f9a8d4', '#c4b5fd'].map(color => (
              <button
                key={color}
                onClick={() => editor?.chain().focus().toggleHighlight({ color }).run()}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                title="高亮背景色"
              />
            ))}
          </div>

          <div className="w-px h-7 bg-gray-300 dark:bg-gray-600 mx-1"></div>

          {/* 文字颜色 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">文字</span>
            {['#000000', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed'].map(color => (
              <button
                key={color}
                onClick={() => setColor(color)}
                className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                title="文字颜色"
              />
            ))}
          </div>
        </div>

        {/* 编辑区域 */}
        <div className="flex-1 overflow-hidden p-6">
          <EditorContent
            editor={editor}
            className="h-full w-full overflow-y-auto outline-none text-gray-800 dark:text-gray-200"
            style={{ fontSize: `${editorFontSize}px` }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }

        :global(.ProseMirror) {
          min-height: 100%;
          outline: none;
        }

        :global(.ProseMirror p) {
          margin: 0.5em 0;
        }
      `}</style>
    </>
  )
}
