import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

// GET /api/contents - 获取内容列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const favorite = searchParams.get('favorite') // 'true' | 'false' | null
    const deleted = searchParams.get('deleted') // 'true' | 'false' | null
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('contents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 筛选已收藏
    if (favorite === 'true') {
      query = query.eq('is_favorite', true)
    } else if (favorite === 'false') {
      query = query.eq('is_favorite', false)
    }

    // 筛选已删除
    if (deleted === 'true') {
      query = query.eq('is_deleted', true)
    } else if (deleted === 'false') {
      query = query.eq('is_deleted', false)
    } else {
      // 默认不显示已删除的
      query = query.eq('is_deleted', false)
    }

    // 按标签筛选
    if (tag) {
      query = query.contains('tags', [tag])
    }

    // 搜索
    if (search) {
      query = query.or(`title.ilike.%${search}%,ai_summary.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('获取内容失败:', error)
      return NextResponse.json(
        { error: '获取内容失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      contents: data || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('获取内容列表错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// POST /api/contents - 保存新内容
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { url, title, platform, raw_content, ai_summary, summary_prompt, tags } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL 不能为空' },
        { status: 400 }
      )
    }

    const insertData = {
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
      console.error('保存内容失败:', error)
      return NextResponse.json(
        { error: '保存失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('保存内容错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
