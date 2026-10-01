import "@/assets/fonts/generated/pretendard-rest.css";
import "./globals.css";
import Shell from "@/components/Shell";
import { pretendard } from "./fonts";
import { getCalendarSummary } from "@/lib/calendar";
import { getGitHubStatus } from "@/lib/github";
import { getPipeline } from "@/lib/pipeline";
import { getGroups } from "@/lib/projects";
import { getSearchIndex } from "@/lib/search";
import { rootMetadata } from "@/lib/site";

// 제목·설명·링크 미리보기(openGraph, 트위터 카드). 내용은 lib/site.js (data/profile.json 기반)
export const metadata = rootMetadata;

// 첫 방문 화면 전체 도착 연출 (첫 그림 전에 실행되는 짧은 스크립트).
// 브라우저 기준 처음 한 번만: 어느 주소로 들어오든 방문 표시를 남기고,
// 첫 화면("/")으로 바로 들어온 경우에만 연출 (움직임 줄이기면 안 함).
// - <html class="hub-intro">: CSS 덮개(가운데 빛, "건너뛰기")가 첫 그림부터 화면을 덮음. 메인 화면은 그 아래 그대로 그려짐
// - public/hero-intro.js 를 async 로 불러와 캔버스 연출이 덮개를 이어받음 (첫 그림을 막지 않음)
// - 클릭·터치·아무 키·휠 → 건너뛰기. 연출 파일이 2.5초 안에 시작 못 하면 덮개를 그냥 걷음
//   (연출은 페이지 준비가 끝나 한가해질 때 시작하므로, 그 전까지는 덮개만 보임)
// - 덮개가 걷힐 때 <html class="hub-reveal"> → 소개 문구가 차례로 떠오름 (globals.css)
const ARRIVAL_SCRIPT = `try{var k="hub-visited";if(!localStorage.getItem(k)){localStorage.setItem(k,"1");if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){
var d=document.documentElement,ended=0,revealed=0,ev=["pointerdown","keydown","wheel","touchstart"];
d.classList.add("hub-intro");d.style.setProperty("--hub-skip-label",'"건너뛰기"');
function reveal(){if(revealed)return;revealed=1;d.classList.remove("hub-intro");d.classList.add("hub-reveal");setTimeout(function(){d.classList.remove("hub-reveal")},1400)}
function end(){if(ended)return;ended=1;reveal();ev.forEach(function(e){removeEventListener(e,skip,true)})}
function skip(){if(window.__hubIntroSkip)window.__hubIntroSkip();else end()}
window.__hubIntroReveal=reveal;window.__hubIntroEnd=end;
ev.forEach(function(e){addEventListener(e,skip,{capture:true,passive:true})});
var s=document.createElement("script");s.src="/hero-intro.js";s.async=true;document.head.appendChild(s);
setTimeout(function(){if(!window.__hubIntroSkip)end()},2500)}}}catch(e){}`;

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
    // suppressHydrationWarning: 도착 연출 스크립트가 html 클래스·스타일을 잠깐 바꾸므로
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ARRIVAL_SCRIPT }} />
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
