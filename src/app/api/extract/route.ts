import { NextRequest, NextResponse } from 'next/server'
import { extractContent } from '@/lib/extractors/extractor'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, xiaohongshu_cookie, use_jina } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL 不能为空' },
        { status: 400 }
      )
    }

    // 验证 URL 格式
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: '无效的 URL 格式' },
        { status: 400 }
      )
    }

    const result = await extractContent(url, {
      xiaohongshuCookie: xiaohongshu_cookie,
      useJina: use_jina !== false
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('内容提取失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '提取失败' },
      { status: 500 }
    )
  }
}
