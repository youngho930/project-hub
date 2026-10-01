import localFont from "next/font/local";

// 화면 글꼴: Pretendard (OFL — assets/fonts/LICENSE.txt). 외부 CDN 대신 사이트 안에서 바로 제공.
// 사이트에 들어가는 글자만 담은 부분 글꼴로, 빌드 전에 scripts/build-fonts.mjs 가 원본
// (assets/fonts/source)에서 새로 만듦 (npm run build / dev 의 prebuild·predev). 굵기는 화면에 쓰는 400·600·700.
// 그 밖의 한글(커밋 메시지 등 빌드 뒤에 들어오는 글자)은 "Pretendard Rest" 가 필요할 때만 받음
// (@font-face 는 assets/fonts/generated/pretendard-rest.css, app/layout.js 에서 불러옴)
// (공유 이미지용 woff 파일은 next/og 가 woff2 를 못 읽어서 따로 둠 — lib/og.js)
export const pretendard = localFont({
  src: [
    { path: "../assets/fonts/generated/Pretendard-Regular.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/generated/Pretendard-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/generated/Pretendard-Bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-pretendard",
  // 시스템 글꼴 앞에 "Pretendard Rest": 부분 글꼴에 없는 한글만 그 조각에서 받아 표시 (--font-pretendard 에 포함됨)
  fallback: [
    "Pretendard Rest",
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Segoe UI",
    "Malgun Gothic",
    "Apple SD Gothic Neo",
    "Noto Sans KR",
    "sans-serif",
  ],
});
