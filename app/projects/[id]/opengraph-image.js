import { ImageResponse } from "next/og";
import { OG_COLOR, OG_SIZE, OgFrame, OgLabel, clip, loadFonts } from "@/lib/og";
import { NEEDS_CHECK, getAllProjects, getProject } from "@/lib/projects";
import { SITE_HOST, SITE_NAME } from "@/lib/site";

// 프로젝트별 미리보기 이미지: 그룹 라벨, 이름, 요약, 대표 효과(있으면), 진행 배지, 기술 태그 최대 3개
// 빌드 때 프로젝트마다 미리 만들어 둔다 (요청 때 글꼴을 읽지 않게).
// alt 는 파일 하나에 하나라 공통 문구 (프로젝트 이름은 og:title 에 있음)
export const alt = "신영호 포트폴리오 프로젝트 소개 이미지";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllProjects().map((project) => ({ id: project.id }));
}

// 첫 화면 카드와 같은 그룹 색
const GROUP_COLOR = { "업무 자동화": OG_COLOR.amber, "개인 AI 비서": OG_COLOR.violet };

const BADGE = {
  "개발 중": { color: "#60a5fa", border: "rgba(96,165,250,0.45)", background: "rgba(59,130,246,0.15)" },
  "구상 중": { color: OG_COLOR.muted, border: OG_COLOR.line, background: "rgba(31,37,51,0.8)" },
};

export default async function Image({ params }) {
  const { id } = await params;
  const project = getProject(id);
  const fonts = await loadFonts();

  if (!project) {
    return new ImageResponse(
      (
        <OgFrame>
          <OgLabel>PROJECT</OgLabel>
          <div style={{ display: "flex", marginTop: 30, fontSize: 64, fontWeight: 700 }}>{SITE_NAME}</div>
        </OgFrame>
      ),
      { ...size, fonts }
    );
  }

  const color = GROUP_COLOR[project.group] ?? OG_COLOR.blue;
  const badge = BADGE[project.status];
  const result = project.results?.[0];
  const tech = (project.tech ?? []).filter((t) => t && t !== NEEDS_CHECK).slice(0, 3);

  return new ImageResponse(
    (
      <OgFrame glow={color}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <OgLabel color={color}>{project.group}</OgLabel>
          {badge && (
            <div
              style={{
                display: "flex",
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 20,
                fontWeight: 700,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                background: badge.background,
              }}
            >
              {project.status}
            </div>
          )}
        </div>

        <div style={{ display: "flex", marginTop: 26, fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>
          {clip(project.name, 20)}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            maxWidth: 1000,
            fontSize: 32,
            fontWeight: 500,
            lineHeight: 1.45,
            color: "#c3c9d4",
          }}
        >
          {clip(project.summary, 72)}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto", gap: 32 }}>
          {result ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22, fontWeight: 500, color: OG_COLOR.muted }}>
                {result.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 8 }}>
                {result.before ? (
                  <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: OG_COLOR.muted }}>
                    {`${result.before} →`}
                  </div>
                ) : null}
                <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color, lineHeight: 1 }}>
                  {result.after}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <div style={{ display: "flex", gap: 10 }}>
            {tech.map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 22,
                  fontWeight: 500,
                  color: "#c3c9d4",
                  border: `1px solid ${OG_COLOR.line}`,
                  background: "rgba(15,19,27,0.9)",
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 30,
            paddingTop: 20,
            borderTop: `1px solid ${OG_COLOR.line}`,
            fontSize: 20,
            fontWeight: 500,
            color: OG_COLOR.muted,
          }}
        >
          <div style={{ display: "flex" }}>{SITE_NAME}</div>
          <div style={{ display: "flex" }}>{`${SITE_HOST}/projects/${project.id}`}</div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts }
  );
}
