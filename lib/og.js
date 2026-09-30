import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 링크 미리보기 이미지(next/og) 공통: 크기, 글꼴, 색, 배경.
// 글꼴은 assets/fonts 의 Pretendard 부분 글꼴(한글 2350자 + 영문, OFL — assets/fonts/LICENSE.txt).
// next/og 는 woff2 를 못 읽어 woff 를 쓰고, 굵기는 500·700 두 개만 넣었다.

export const OG_SIZE = { width: 1200, height: 630 };

const FONT_DIR = join(process.cwd(), "assets", "fonts");
let fontsPromise;

export function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(FONT_DIR, "Pretendard-Medium.subset.woff")),
    readFile(join(FONT_DIR, "Pretendard-Bold.subset.woff")),
  ]).then(([medium, bold]) => [
    { name: "Pretendard", data: medium, weight: 500, style: "normal" },
    { name: "Pretendard", data: bold, weight: 700, style: "normal" },
  ]);
  return fontsPromise;
}

export const OG_COLOR = {
  bg: "#0b0e14",
  card: "#131823",
  line: "#262d3d",
  text: "#e5e7eb",
  muted: "#9aa2b1",
  amber: "#f59e0b",
  violet: "#a78bfa",
  blue: "#60a5fa",
};

// 빛 번짐 배경: next/og 의 CSS radial-gradient 는 경계가 네모나게 보여서 SVG 그림으로 그린다
function glowBackground(glow) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#111624"/><stop offset="1" stop-color="#0b0e14"/>
    </linearGradient>
    <radialGradient id="a" cx="1060" cy="40" r="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.34"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b" cx="120" cy="660" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f59e0b" stop-opacity="0.22"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#b)"/>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// 첫 화면과 같은 어두운 배경 + 은은한 보라(오른쪽 위)·주황(왼쪽 아래) 빛 번짐
export function OgFrame({ glow = OG_COLOR.violet, children }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: OG_COLOR.bg,
        fontFamily: "Pretendard",
        color: OG_COLOR.text,
        wordBreak: "keep-all",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={glowBackground(glow)}
        width={1200}
        height={630}
        alt=""
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "64px 72px 52px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// 작은 영문 라벨 (앞에 빛나는 점)
export function OgLabel({ children, color = OG_COLOR.amber }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 20,
        fontWeight: 700,
        // 영문 대문자 라벨은 넓게, 한글 라벨은 조금만
        letterSpacing: /^[A-Z ]+$/.test(String(children)) ? 5 : 1.5,
        color,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 14px ${color}`,
        }}
      />
      {children}
    </div>
  );
}

// 긴 문장은 글자 수로 잘라 말줄임
export function clip(text, max) {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
