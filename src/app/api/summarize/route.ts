import { NextRequest, NextResponse } from 'next/server'
import { summarizeContent, streamSummarize } from '@/lib/deepseek'

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
    const { content, custom_prompt, stream } = body

    if (!content) {
      return NextResponse.json(
        { error: '内容不能为空' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 如果需要流式返回
    if (stream) {
      const encoder = new TextEncoder()

      const readable = new ReadableStream({
        async start(controller) {
          try {
            await streamSummarize(
              content,
              custom_prompt || '请总结以下内容：',
              (chunk) => {
                controller.enqueue(encoder.encode(chunk))
              }
            )
          } catch (error) {
            controller.error(error)
          } finally {
            controller.close()
          }
        }
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders()
        }
      })
    }

    // 普通模式
    const result = await summarizeContent(content, custom_prompt)
    return NextResponse.json(result, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '总结失败' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
