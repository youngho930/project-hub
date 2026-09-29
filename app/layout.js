import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getGroups } from "@/lib/projects";

export const metadata = {
  title: "Project Hub",
  description: "포트폴리오 프로젝트 통합 관리",
};

export default function RootLayout({ children }) {
  // 사이드바·상단 바에는 이름과 id만 넘김 (클라이언트로 보낼 데이터 최소화)
  const groups = getGroups().map((group) => ({
    name: group.name,
    projects: group.projects.map(({ id, name }) => ({ id, name })),
  }));
  const projectNames = Object.fromEntries(
    groups.flatMap((group) => group.projects.map((p) => [p.id, p.name]))
  );

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
        <Sidebar groups={groups} />
        <div className="ml-60 min-h-screen">
          <Topbar projectNames={projectNames} />
          <main className="px-10 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
