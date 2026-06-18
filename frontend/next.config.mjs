/** @type {import('next').NextConfig} */

// Capacitor 네이티브 래핑 및 정적 호스팅을 위해 정적 export로 빌드한다.
// 모든 페이지가 클라이언트 렌더링 + 런타임 API 호출이라 SSR이 불필요하다.
const nextConfig = {
  output: "export",
  images: {
    // 정적 export에서는 Next 이미지 최적화 서버를 쓸 수 없다.
    unoptimized: true,
  },
  // 정적 호스트/네이티브 파일시스템 호환을 위해 디렉토리 형태 경로 사용
  trailingSlash: true,
};

export default nextConfig;
