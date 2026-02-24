/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // 클릭재킹 방지: 다른 사이트의 iframe에 삽입되는 것을 막음
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // MIME 스니핑 방지: 브라우저가 Content-Type을 임의로 추론하지 않도록
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // 리퍼러 제어: 외부 링크 클릭 시 최소한의 출처 정보만 전달
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 미사용 브라우저 API 비활성화 (카메라·마이크·위치정보 접근 차단)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // CSP: 리소스 출처 제한
          // unsafe-inline/unsafe-eval은 Next.js 하이드레이션 인라인 스크립트에 필요
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
