import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/supabase'

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

// GET /api/contents/[id] - 获取单个内容
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401, headers: corsHeaders() }
      )
    }

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500, headers: corsHeaders() }
      )
    }

    const { id } = await params

    const { data, error } = await client
      .from('contents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: '内容不存在' },
        { status: 404, headers: corsHeaders() }
      )
    }

    return NextResponse.json(data, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500, headers: corsHeaders() }
    )
  }
}

// PUT /api/contents/[id] - 更新内容
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401, headers: corsHeaders() }
      )
    }

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500, headers: corsHeaders() }
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

    const { data, error } = await client
      .from('contents')
      .update(updateData as never)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500, headers: corsHeaders() }
      )
    }

    return NextResponse.json(data, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500, headers: corsHeaders() }
    )
  }
}

// DELETE /api/contents/[id] - 删除内容
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401, headers: corsHeaders() }
      )
    }

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500, headers: corsHeaders() }
      )
    }

    const { id } = await params

    const { error } = await client
      .from('contents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: '删除失败' },
        { status: 500, headers: corsHeaders() }
      )
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
