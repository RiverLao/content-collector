import { NextRequest, NextResponse } from 'next/server'
import { summarizeContent, streamSummarize } from '@/lib/deepseek'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, custom_prompt, stream } = body

    if (!content) {
      return NextResponse.json(
        { error: '内容不能为空' },
        { status: 400 }
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
          'Cache-Control': 'no-cache'
        }
      })
    }

    // 普通模式
    const result = await summarizeContent(content, custom_prompt)
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI 总结失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '总结失败' },
      { status: 500 }
    )
  }
}
