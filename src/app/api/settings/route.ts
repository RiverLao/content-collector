import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

// GET /api/settings - 获取用户设置
// POST /api/settings - 保存用户设置

// 简单的用户标识（后续可扩展为认证系统）
const getUserId = () => 'default_user'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({})
    }

    const userId = getUserId()

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('获取设置失败:', error)
      return NextResponse.json({})
    }

    // 转换为对象格式
    const settings: Record<string, string> = {}
    const items = (data || []) as Array<{ key: string; value: string }>
    for (const item of items) {
      if (item.key) {
        settings[item.key] = item.value
      }
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('获取设置错误:', error)
    return NextResponse.json({})
  }
}

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
    const { key, value } = body
    const userId = getUserId()

    if (!key) {
      return NextResponse.json(
        { error: '设置键不能为空' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, key, value } as never)
      .select()
      .single()

    if (error) {
      console.error('保存设置失败:', error)
      return NextResponse.json(
        { error: '保存失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('保存设置错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 批量获取/保存设置
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: '数据库未配置' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { settings } = body
    const userId = getUserId()

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: '无效的设置对象' },
        { status: 400 }
      )
    }

    // 构建 upsert 数据
    const records = Object.entries(settings).map(([key, value]) => ({
      user_id: userId,
      key,
      value: String(value)
    }))

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(records as never)
      .select()

    if (error) {
      console.error('批量保存设置失败:', error)
      return NextResponse.json(
        { error: '保存失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('批量保存设置错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
