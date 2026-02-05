import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCorsHeaders } from '@/lib/cors'

// OPTIONS 预检请求
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  })
}

// GET /api/contents - 获取当前用户的内容列表
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 必须使用 SSR 客户端 (supabase) 而不是全局单例 (getSupabaseClient)，否则无法通过 RLS
    
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const favorite = searchParams.get('favorite')
    const deleted = searchParams.get('deleted')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('contents')
      .select('*', { count: 'exact' })

    // 如果用户未登录，RLS 会自然过滤掉所有数据，或者我们可以提前返回空
    if (user) {
      query = query.eq('user_id', user.id)
    } else {
      // 未登录直接返回空，避免无效查询
      return NextResponse.json({
        contents: [],
        total: 0,
        limit,
        offset
      }, { headers: getCorsHeaders(request) })
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
      console.error('Fetch Contents Error:', error)
      return NextResponse.json(
        { error: '获取内容失败' },
        { status: 500, headers: getCorsHeaders(request) }
      )
    }

    return NextResponse.json({
      contents: data || [],
      total: count || 0,
      limit,
      offset
    }, { headers: getCorsHeaders(request) })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500, headers: getCorsHeaders(request) }
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
        { status: 401, headers: getCorsHeaders(request) }
      )
    }

    // 必须使用 SSR 客户端 (supabase) 进行插入，它携带了用户的 Auth Token
    // 之前使用 getSupabaseClient() 是匿名客户端，会导致 RLS 失败

    const body = await request.json()
    const { url, title, platform, raw_content, ai_summary, summary_prompt, tags } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL 不能为空' },
        { status: 400, headers: getCorsHeaders(request) }
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

    const { data, error } = await supabase
      .from('contents')
      .insert(insertData as never)
      .select()
      .single()

    if (error) {
      console.error('Supabase Insert Error:', error)
      return NextResponse.json(
        { 
          error: error.message || '保存失败',
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500, headers: getCorsHeaders(request) }
      )
    }

    return NextResponse.json(data, { headers: getCorsHeaders(request) })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500, headers: getCorsHeaders(request) }
    )
  }
}
