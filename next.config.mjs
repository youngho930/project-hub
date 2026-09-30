/** @type {import('next').NextConfig} */
const nextConfig = {
  // 서버에서 다시 그리는 페이지(그래프, 10분마다 재생성되는 프로젝트 화면)도
  // public/previews 의 이미지 파일 유무를 확인할 수 있게 서버 번들에 포함
  outputFileTracingIncludes: {
    "/graph": ["./public/previews/**/*"],
    "/projects/*": ["./public/previews/**/*"],
  },
};

export default nextConfig;
