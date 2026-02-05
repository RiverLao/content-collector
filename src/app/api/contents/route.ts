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

// GET /api/contents - 获取当前用户的内容列表
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const client = getSupabaseClient()
    if (!client) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500, headers: corsHeaders() }
      )
    }

    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const favorite = searchParams.get('favorite')
    const deleted = searchParams.get('deleted')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = client
      .from('contents')
      .select('*', { count: 'exact' })

    if (user) {
      query = query.eq('user_id', user.id)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (favorite === 'true') {
      query = query.eq('is_favorite', true)
    } else if (favorite === 'false') {
      query = query.eq('is_favorite', false)
    }

    if (deleted === 'true') {
      query = query.eq('is_deleted', true)
    } else if (deleted === 'false') {
      query = query.eq('is_deleted', false)
    } else {
      query = query.eq('is_deleted', false)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,ai_summary.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json(
        { error: '获取内容失败' },
        { status: 500, headers: corsHeaders() }
      )
    }

    return NextResponse.json({
      contents: data || [],
      total: count || 0,
      limit,
      offset
    }, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500, headers: corsHeaders() }
    )
  }
}

// POST /api/contents - 保存新内容
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { url, title, platform, raw_content, ai_summary, summary_prompt, tags } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL 不能为空' },
        { status: 400, headers: corsHeaders() }
      )
    }

    const insertData = {
      user_id: user.id,
      url,
      title,
      platform,
      raw_content,
      ai_summary,
      summary_prompt,
      tags: tags || []
    }

    const { data, error } = await client
      .from('contents')
      .insert(insertData as never)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: '保存失败' },
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
