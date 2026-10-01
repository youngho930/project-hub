import "./globals.css";
import Shell from "@/components/Shell";
import { getCalendarSummary } from "@/lib/calendar";
import { getGitHubStatus } from "@/lib/github";
import { getPipeline } from "@/lib/pipeline";
import { getGroups } from "@/lib/projects";
import { getSearchIndex } from "@/lib/search";
import { rootMetadata } from "@/lib/site";

// 제목·설명·링크 미리보기(openGraph, 트위터 카드). 내용은 lib/site.js (data/profile.json 기반)
export const metadata = rootMetadata;

export default async function RootLayout({ children }) {
  // 사이드바·상단 바에는 이름과 id만 넘김 (클라이언트로 보낼 데이터 최소화)
  const groups = getGroups().map((group) => ({
    name: group.name,
    projects: group.projects.map(({ id, name, status }) => ({ id, name, status })),
  }));
  const projectNames = Object.fromEntries(
    groups.flatMap((group) => group.projects.map((p) => [p.id, p.name]))
  );
  // 연결 상태 글자("연결됨" / "미설정" / "오류")만 넘김
  const [githubStatus, calendar, pipeline] = await Promise.all([
    getGitHubStatus(),
    getCalendarSummary(),
    getPipeline(),
  ]);

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="antialiased">
        <Shell
          sidebar={{
            groups,
            githubStatus,
            calendarStatus: calendar.status,
            pipelineStatus: pipeline.status,
          }}
          projectNames={projectNames}
          // 검색 창용: 이름·요약·기술·결정 문장만 (저장소·커밋·이메일 없음)
          searchIndex={getSearchIndex()}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
