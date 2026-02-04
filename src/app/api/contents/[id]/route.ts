import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

// GET /api/contents/[id] - 获取单个内容
// PUT /api/contents/[id] - 更新内容
// DELETE /api/contents/[id] - 删除内容

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500 }
      )
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: '内容不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('获取内容错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.ai_summary !== undefined) updateData.ai_summary = body.ai_summary
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.raw_content !== undefined) updateData.raw_content = body.raw_content
    if (body.summary_prompt !== undefined) updateData.summary_prompt = body.summary_prompt
    if (body.is_favorite !== undefined) updateData.is_favorite = body.is_favorite
    if (body.is_deleted !== undefined) updateData.is_deleted = body.is_deleted

    const { data, error } = await supabase
      .from('contents')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新内容失败:', error)
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('更新内容错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500 }
      )
    }

    const { id } = await params

    const { error } = await supabase
      .from('contents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除内容失败:', error)
      return NextResponse.json(
        { error: '删除失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除内容错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
