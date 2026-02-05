import { NextRequest } from 'next/server'

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')
  
  // 允许的 Origin 列表
  // 允许所有 chrome-extension:// 开头的 Origin，以及本地开发和 Vercel 部署地址
  const isAllowedOrigin = origin && (
    origin.startsWith('chrome-extension://') || 
    origin.includes('localhost') || 
    origin.includes('vercel.app')
  )

  if (isAllowedOrigin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    }
  }

  // 默认配置（不带 Credentials）
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
