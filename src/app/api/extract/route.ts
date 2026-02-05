import { NextRequest, NextResponse } from 'next/server'
import { extractContent } from '@/lib/extractors/extractor'

// CORS 头
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

// OPTIONS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, xiaohongshu_cookie, use_jina } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL 不能为空' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 验证 URL 格式
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: '无效的 URL 格式' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const result = await extractContent(url, {
      xiaohongshuCookie: xiaohongshu_cookie,
      useJina: use_jina !== false
    })

    return NextResponse.json(result, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '提取失败' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
