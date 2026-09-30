import { ImageResponse } from "next/og";
import profile from "@/data/profile.json";
import { OG_COLOR, OG_SIZE, OgFrame, OgLabel, loadFonts } from "@/lib/og";
import { SITE_HOST, SITE_NAME } from "@/lib/site";

// 대표 미리보기 이미지: 라벨, 이름, 한 줄 소개(가장 크게), 대표 숫자 3개, 사이트 주소.
// 소개 내용은 data/profile.json 에서 가져온다 (이메일 등은 넣지 않음).
export const alt = `${SITE_NAME} — ${profile.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <OgLabel>PORTFOLIO</OgLabel>
        <div style={{ display: "flex", marginTop: 30, fontSize: 30, fontWeight: 500, color: "#c9ced8" }}>
          {profile.name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 10,
            fontSize: 66,
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: -1.5,
            maxWidth: 1000,
          }}
        >
          {profile.tagline}
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: "auto" }}>
          {profile.highlights.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "22px 26px",
                borderRadius: 20,
                border: `1px solid ${OG_COLOR.line}`,
                background: "rgba(19,24,35,0.85)",
              }}
            >
              <div style={{ display: "flex", fontSize: 50, fontWeight: 700, color: OG_COLOR.amber, lineHeight: 1 }}>
                {item.value}
              </div>
              <div style={{ display: "flex", marginTop: 12, fontSize: 22, fontWeight: 500, color: OG_COLOR.muted }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 26,
            fontSize: 20,
            fontWeight: 500,
            color: OG_COLOR.muted,
          }}
        >
          <div style={{ display: "flex" }}>{profile.subline}</div>
          <div style={{ display: "flex" }}>{SITE_HOST}</div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await loadFonts() }
  );
}
