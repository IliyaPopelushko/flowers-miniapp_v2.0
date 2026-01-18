export const config = {
  matcher: '/api/:path*',
}

export default function middleware(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-VK-Params',
        'Access-Control-Max-Age': '86400',
      },
    })
  }
}
