import "./globals.css";
import Shell from "@/components/Shell";
import { getCalendarSummary } from "@/lib/calendar";
import { getGitHubStatus } from "@/lib/github";
import { getPipeline } from "@/lib/pipeline";
import { getGroups } from "@/lib/projects";

export const metadata = {
  title: "신영호 · Project Hub",
  description: "현장의 반복 업무를 직접 찾아 자동화하는 신영호의 포트폴리오",
};

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
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
