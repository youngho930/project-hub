import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Share2 } from "lucide-react";
import CopyEmail from "@/components/home/CopyEmail";
import ClampWords from "@/components/home/ClampWords";
import CountUp from "@/components/home/CountUp";
import GraphTeaser from "@/components/home/GraphTeaser";
import HeroStarfield from "@/components/home/HeroStarfield";
import { ILLUSTRATIONS } from "@/components/illustrations";
import { TYPE_META } from "@/components/graph/types";
import { BoardCard, PipelineCard } from "@/components/OperationCards";
import StatusBadge from "@/components/StatusBadge";
import { getCalendarSummary } from "@/lib/calendar";
import RelativeTime from "@/components/RelativeTime";
import { getLatestCommitAt } from "@/lib/github";
import { getGraph } from "@/lib/graph";
import { getPipeline } from "@/lib/pipeline";
import { getCardPreview } from "@/lib/previews";
import { getProfile } from "@/lib/profile";
import { ideaSuffix } from "@/lib/project-count";
import { NEEDS_CHECK, PROJECT_STATUS, getAllProjects } from "@/lib/projects";

// 프로젝트 종류(그룹)별 색: 썸네일이 없을 때 배경, 마우스를 올렸을 때 빛 번짐
const GROUP_COLOR = {
  "업무 자동화": "#f59e0b",
  "개인 AI 비서": "#a78bfa",
};
const DEFAULT_COLOR = "#60a5fa";

// 연결 상태별 점 색 (사이드바와 같은 기준)
const DOT_COLOR = {
  연결됨: "bg-green",
  오류: "bg-red",
  미설정: "bg-muted/50",
  지연: "bg-orange",
};

function GitHubMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// 섹션 머리: 작은 영문 라벨 + 한글 제목 (+ 오른쪽 보조 문구)
function SectionHead({ label, title, aside, id }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <p className="label text-accent/90">{label}</p>
        <h2 id={id} className="mt-1.5 text-heading font-bold tracking-tight">
          {title}
        </h2>
      </div>
      {aside}
    </div>
  );
}

// 대표 효과 한 줄: 첫 번째 결과 (전·후가 있으면 화살표로)
function mainEffect(project) {
  const result = project.results?.[0];
  if (!result) return null;
  return {
    label: result.label,
    text: result.before ? `${result.before} → ${result.after}` : result.after,
  };
}

// 넓은 화면에서 두 칸을 차지하는 대표작. 값은 두 칸이 되기 시작하는 화면 크기. (쇼케이스 6개 기준)
//  - 3열(xl): 재고 대시보드·자비스·엑셀 취합 세 개가 두 칸 → 2+1, 1+2, 2+1 로 세 줄이 꽉 참
//  - 2열(sm~lg): 재고 대시보드·자비스가 두 칸 → 2, 1+1, 2, 1+1 로 빈칸 없음
const FEATURED = { "inventory-dashboard": "sm", jarvis: "sm", "excel-merger": "xl" };

// 두 칸일 때는 썸네일(왼쪽)과 설명(오른쪽)을 가로로 놓아 썸네일을 크게
const WIDE = {
  sm: {
    card: "sm:col-span-2 sm:grid sm:grid-cols-[3fr_2fr]",
    thumb: "sm:aspect-auto sm:min-h-[240px]",
    fadeBottom: "sm:hidden",
    fadeSide: "hidden sm:block",
  },
  xl: {
    card: "xl:col-span-2 xl:grid xl:grid-cols-[3fr_2fr]",
    thumb: "xl:aspect-auto xl:min-h-[240px]",
    fadeBottom: "xl:hidden",
    fadeSide: "hidden xl:block",
  },
};

// 카드 썸네일 기준점 (빈 띠 없이 채우면서 핵심 부분이 남게). 없으면 가운데
// 엑셀 취합·검증기: 원본 화면의 제목·소개 문구가 왼쪽 위에 있어, 두 칸 카드에서 좌우가 잘려도 글자가 중간부터 잘리지 않게 왼쪽 위 기준
const THUMB_POSITION = { "inventory-dashboard": "object-left-top", "excel-merger": "object-left-top" };

// 썸네일 밝기: 다크 테마에서 서로 비슷한 밝기로 보이게 (이미지 파일은 그대로, CSS 필터만).
// 평균 밝기(0~255) 재고 대시보드 207·QC AI 챗봇 248 은 많이 낮추고, 14 인 자비스는 조금 밝힘. 마우스를 올리면 원래 밝기
const THUMB_TONE = {
  "inventory-dashboard": "brightness-[0.55]",
  "qc-ai-assistant": "brightness-[0.5]",
  jarvis: "brightness-[1.12]",
};
const DEFAULT_TONE = "brightness-[0.72]";

const STATUS_RANK = { "개발 중": 1 };
const BREAKPOINT_RANK = { sm: 0, xl: 1 };

// 완성된 프로젝트 먼저, 개발 중은 뒤로 (같은 단계 안에서는 order 순).
// 대표작이 두 칸 자리에 오도록 배치: 대표작 0 · 보통 0 · 보통 1 · 대표작 1 · 대표작 2 · 보통 2 …
// (3열: 2+1, 1+2, 2+1 / 2열: 엑셀 취합은 한 칸이라 2, 1+1, 2, 1+1)
function arrange(projects) {
  const ranked = [...projects].sort(
    (a, b) => (STATUS_RANK[a.status] ?? 0) - (STATUS_RANK[b.status] ?? 0)
  );
  // 대표작은 두 칸이 되는 폭이 좁은 것(sm)부터: 2열에서는 sm 대표작 두 개만 두 칸이라
  // 0번·3번 자리에 sm 대표작이 와야 빈칸이 없음 (order 순으로 고르면 엑셀 취합이 3번 자리에 와서 혼자 남았음)
  const featured = ranked
    .filter((p) => FEATURED[p.id])
    .sort((a, b) => BREAKPOINT_RANK[FEATURED[a.id]] - BREAKPOINT_RANK[FEATURED[b.id]]);
  const rest = ranked.filter((p) => !FEATURED[p.id]);
  return [featured[0], rest[0], rest[1], featured[1], featured[2], rest[2], ...rest.slice(3)].filter(Boolean);
}

function ProjectCard({ project }) {
  const preview = getCardPreview(project.id);
  const Illustration = preview ? null : ILLUSTRATIONS[project.id];
  const wide = WIDE[FEATURED[project.id]];
  const color = GROUP_COLOR[project.group] ?? DEFAULT_COLOR;
  const effect = mainEffect(project);
  const tech = (project.tech ?? []).filter((t) => t && t !== NEEDS_CHECK).slice(0, 3);

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`glow-card group flex flex-col overflow-hidden rounded-2xl border border-line bg-card ${wide?.card ?? ""}`}
      style={{ "--glow": color }}
    >
      <div
        className={`relative aspect-[16/10] overflow-hidden ${wide?.thumb ?? ""}`}
        style={{
          background: `radial-gradient(120% 90% at 85% 0%, ${color}38 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, ${color}1f 0%, transparent 60%), var(--color-inset)`,
        }}
      >
        {preview ? (
          // 평소에는 살짝 어둡게, 마우스를 올리면 원래 밝기
          <Image
            src={preview.src}
            alt={`${project.name} 미리보기`}
            fill
            sizes={
              wide
                ? "(min-width: 1280px) 700px, (min-width: 640px) 60vw, 100vw"
                : "(min-width: 1280px) 400px, (min-width: 640px) 45vw, 100vw"
            }
            // 카드 썸네일은 빈 띠 없이 채움. 기준점은 프로젝트마다 (자비스는 가운데 원형 화면,
            // 재고 대시보드는 왼쪽 메뉴가 잘리지 않게 왼쪽 위). 프로젝트 화면 PREVIEW 는 잘리지 않는 방식 유지
            className={`object-cover ${THUMB_POSITION[project.id] ?? "object-center"} ${THUMB_TONE[project.id] ?? DEFAULT_TONE} saturate-[0.9] transition-[filter,transform] duration-300 group-hover:scale-[1.02] group-hover:brightness-100 group-hover:saturate-100 motion-reduce:transition-none`}
          />
        ) : Illustration ? (
          <span className="absolute inset-0 p-3 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
            <Illustration />
          </span>
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <span
              className="rounded-full border px-3 py-1 text-label font-semibold tracking-[0.18em] uppercase"
              style={{ borderColor: `${color}55`, color, background: `${color}14` }}
            >
              {project.group}
            </span>
          </span>
        )}
        {/* 모든 썸네일 공통: 아래쪽이 카드 배경색으로 살짝 어두워짐 (가로 배치 카드도) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card/70 to-transparent"
        />
        {/* 썸네일 아래(가로 배치면 오른쪽)가 카드 배경으로 스며들게 */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-card via-card/60 to-transparent ${wide?.fadeBottom ?? ""}`}
        />
        {wide && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-card via-card/50 to-transparent ${wide.fadeSide}`}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-title font-bold tracking-tight">
            {project.name}
          </h3>
          <StatusBadge status={project.status} className="mt-0.5" />
        </div>
        {/* 최대 2줄, 단어 단위로 줄이고 말줄임 */}
        <ClampWords text={project.summary} className="mt-1.5 text-body leading-relaxed text-muted" />

        {effect && (
          <p className="mt-4 flex items-baseline gap-2 text-body">
            <span className="shrink-0 text-caption text-muted">{effect.label}</span>
            <span className="font-semibold" style={{ color }}>
              {effect.text}
            </span>
          </p>
        )}

        {tech.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {tech.map((t) => (
              <li
                key={t}
                className="rounded-md border border-line bg-inset px-2 py-0.5 text-label text-muted"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}

export default async function Home() {
  const profile = getProfile();
  const allProjects = getAllProjects();
  const nameOf = Object.fromEntries(allProjects.map((p) => [p.id, p.name]));
  // 쇼케이스·개수는 만든 것만. 구상 중인 프로젝트는 쇼케이스 아래 "다음에 만들 것" 한 줄로
  const projects = allProjects.filter((p) => p.status !== PROJECT_STATUS.idea);
  const upcoming = allProjects.filter((p) => p.status === PROJECT_STATUS.idea);

  const graph = getGraph();
  // 프로젝트 수에는 구상 중 노드를 넣지 않음 (그래프에는 "구상 중"으로 구분해 남아 있음)
  const countOf = (type) =>
    graph.nodes.filter((node) => node.type === type && !node.idea).length;

  // 개수·시각과 상태만 받음 (일정·공고 내용, 지원 단계별 개수는 서버 밖으로 나오지 않음)
  const [github, calendar, pipeline] = await Promise.all([
    getLatestCommitAt(),
    getCalendarSummary(),
    getPipeline(),
  ]);
  // LIVE 패널: 연결돼 있고 값을 받았으면 짧은 실제 정보, 아니면 지금처럼 상태 글자
  const isUp = (status) => status === "연결됨" || status === "지연";
  // 최근 커밋이 7일보다 오래됐거나(github.recent) 개수가 0이면 숫자 대신 "연결됨"
  // (오래된 날짜·0 이 오히려 멈춘 것처럼 보이지 않게)
  const sources = [
    {
      name: "GitHub",
      status: github.status,
      detail: isUp(github.status) && github.recent && (
        <>
          최근 커밋 <RelativeTime iso={github.at} />
        </>
      ),
    },
    {
      name: "Calendar",
      status: calendar.status,
      detail: isUp(calendar.status) && calendar.counts.week > 0 && `이번 주 일정 ${calendar.counts.week}개`,
    },
    {
      name: "Job Jarvis",
      status: pipeline.status,
      detail: isUp(pipeline.status) && pipeline.saved > 0 && `저장 공고 ${pipeline.saved}건`,
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-16 sm:space-y-20">
      {/* ① 소개 */}
      <section
        id="hero"
        data-hero
        aria-labelledby="intro-title"
        // 아래 여백은 위보다 짧게 (휴대폰에서 첫 화면 안에 대표 숫자 카드 윗부분이 보이게, 아래 mb-6 도 같은 이유)
        className="relative overflow-hidden rounded-3xl border border-line px-6 pt-10 pb-7 max-sm:mb-6 sm:px-10 sm:pt-16 sm:pb-12 lg:px-14"
        style={{
          background:
            "radial-gradient(60% 80% at 100% 0%, rgba(139,92,246,0.28) 0%, transparent 60%), radial-gradient(50% 70% at 0% 100%, rgba(245,158,11,0.16) 0%, transparent 60%), linear-gradient(180deg, #111624 0%, #0c1019 100%)",
        }}
      >
        {/* 별빛 우주 배경: public/hero-stars.js 가 그림 (나중에 불러옴). 글자·버튼은 아래 HTML 그대로 */}
        <canvas
          aria-hidden="true"
          data-hero-stars
          suppressHydrationWarning
          className="pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-700 motion-reduce:transition-none"
        />
        <HeroStarfield targetId="hero" />

        {/* md 이상(왼쪽 메뉴가 접히는 폭 포함)이면 LIVE 패널을 오른쪽에 둠 → 카드 오른쪽 절반이 비지 않게 */}
        <div className="relative flex flex-col gap-7 sm:gap-10 md:flex-row md:items-end md:justify-between md:gap-8">
          {/* data-star-dim: 이 영역 뒤의 별은 더 적고 어둡게, 별똥별도 피함 (public/hero-stars.js) */}
          <div className="max-w-3xl min-w-0" data-star-dim>
            {/* hero-rise: 첫 방문 도착 연출이 걷힐 때만 차례로 떠오름 (globals.css, app/layout.js) */}
            <p className="hero-rise label flex items-center gap-2 text-accent">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_#f59e0b]" />
              Portfolio
            </p>
            <p className="hero-rise mt-5 text-title font-semibold text-text/80" style={{ "--i": 1 }}>
              {profile.name}
            </p>
            <h1
              id="intro-title"
              style={{ "--i": 2 }}
              className="hero-rise mt-2 text-page leading-[1.2] font-bold tracking-tight sm:text-display lg:text-hero lg:leading-[1.15]"
            >
              {profile.tagline}
            </h1>
            <p className="hero-rise mt-5 text-body text-muted" style={{ "--i": 3 }}>
              {profile.subline}
            </p>

            <div className="hero-rise mt-8 flex flex-wrap gap-3" style={{ "--i": 4 }}>
              {/* data-warp: 누르면 화면 전체 워프 뒤 프로젝트 영역으로 이동 (public/hero-intro.js) */}
              <a
                href="#projects"
                data-warp
                className="flex items-center gap-2 rounded-xl bg-accent min-h-11 px-5 py-2.5 text-body font-semibold text-bg shadow-[0_8px_30px_-8px_#f59e0b] transition hover:brightness-110"
              >
                프로젝트 보기
                <ArrowDown size={15} />
              </a>
              <a
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 min-h-11 px-5 py-2.5 text-body font-semibold backdrop-blur transition-colors hover:border-text/30"
              >
                <GitHubMark size={15} />
                GitHub
                <ArrowUpRight size={14} className="text-muted" />
              </a>
            </div>
          </div>

          {/* 연결 상태: 데이터를 받았으면 짧은 실제 정보(최근 커밋 시각, 이번 주 일정 수, 저장 공고 수), 아니면 상태 글자 */}
          <div
            data-star-avoid
            className="hero-rise shrink-0 rounded-2xl border border-line bg-bg/50 p-4 backdrop-blur sm:w-64"
            style={{ "--i": 4 }}
          >
            <p className="label flex items-center gap-2 text-green">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-green" />
              </span>
              Live
            </p>
            <ul className="mt-3 space-y-2 text-body">
              {sources.map(({ name, status, detail }) => (
                <li key={name} className="flex items-center gap-2.5">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${DOT_COLOR[status] ?? "bg-muted/50"}`}
                  />
                  <span>{name}</span>
                  <span className="ml-auto text-caption whitespace-nowrap text-muted">{detail || status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ② 대표 숫자 */}
      <section aria-label="대표 성과">
        {/* 자바스크립트가 꺼져 있으면 숫자 움직임 없이 최종 값 표시 */}
        <noscript>
          <style>{".count-up{opacity:1!important}"}</style>
        </noscript>
        {/* 640px 미만: 납작한 가로 줄(왼쪽 숫자, 오른쪽 라벨·설명) 세 개 / 이상: 세로 카드 세 칸 */}
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
          {profile.highlights.map((item) => (
            <li key={item.label}>
              <Link
                href={`/projects/${item.project}`}
                className="glow-card group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-line bg-card px-4 py-3.5 sm:flex-col sm:items-stretch sm:gap-0 sm:p-6"
                style={{ "--glow": "#f59e0b" }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-accent/15 blur-3xl max-sm:-left-16 max-sm:right-auto"
                />
                <CountUp
                  value={item.value}
                  className="w-[6.5rem] shrink-0 bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-page leading-none font-bold tracking-tight text-transparent sm:w-auto sm:text-display sm:leading-tight"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body font-semibold sm:mt-3">{item.label}</span>
                  <span className="mt-0.5 text-caption text-muted sm:mt-1">{item.detail}</span>
                  <span className="mt-4 hidden items-center gap-1 text-caption text-muted transition-colors group-hover:text-accent sm:flex">
                    {nameOf[item.project] ?? item.project}
                    <ArrowRight size={12} />
                  </span>
                </span>
                <ArrowRight size={14} className="shrink-0 text-muted sm:hidden" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ③ 프로젝트 쇼케이스 */}
      <section aria-labelledby="projects" className="scroll-mt-20">
        <SectionHead
          id="projects"
          label="Projects"
          title="만든 것들"
          aside={
            <p className="text-body text-muted">
              {projects.length}개 프로젝트{ideaSuffix(upcoming.length)}
            </p>
          }
        />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {arrange(projects).map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        {/* 다음에 만들 것: 구상 중인 프로젝트를 작게 한 줄씩 (쇼케이스 카드·개수에는 넣지 않음) */}
        {upcoming.length > 0 && (
          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-dashed border-line px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
            <p className="label shrink-0 text-accent/90">다음에 만들 것</p>
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {upcoming.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="group flex flex-wrap items-center gap-x-2.5 gap-y-1 text-body"
                  >
                    <span className="font-semibold transition-colors group-hover:text-accent">{project.name}</span>
                    <StatusBadge status={project.status} />
                    <span className="min-w-0 text-caption text-muted max-sm:basis-full">{project.summary}</span>
                    <ArrowRight size={13} className="ml-auto shrink-0 text-muted transition-colors group-hover:text-accent max-sm:hidden" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ④ 일하는 방식 */}
      <section aria-labelledby="how-title">
        <SectionHead id="how-title" label="How I work" title="일하는 방식" />
        <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {profile.stories.map((story, i) => (
            <li key={story.title}>
              <Link
                href={`/projects/${story.project}`}
                className="glow-card group flex h-full flex-col rounded-2xl border border-line bg-card p-6"
              >
                <span className="font-mono text-caption text-accent/80">0{i + 1}</span>
                <h3 className="mt-3 text-title font-bold tracking-tight">{story.title}</h3>
                <p className="mt-3 flex-1 text-body leading-relaxed text-muted">{story.body}</p>
                <span className="mt-5 flex items-center gap-1 text-caption text-muted transition-colors group-hover:text-[#a78bfa]">
                  {nameOf[story.project] ?? story.project}
                  <ArrowRight size={12} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ⑤ 지식 그래프 미리보기 */}
      <section
        aria-labelledby="graph-title"
        className="relative overflow-hidden rounded-3xl border border-line p-6 sm:p-10"
        style={{
          background:
            "radial-gradient(ellipse at 25% 50%, rgba(139,92,246,0.2) 0%, rgba(76,29,149,0.08) 40%, transparent 70%), #0b0e14",
        }}
      >
        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
          <GraphTeaser graph={graph} />
          <div className="w-full">
            <SectionHead id="graph-title" label="Knowledge graph" title="프로젝트가 서로 어떻게 이어지는지" />
            <p className="mt-3 max-w-md text-body leading-relaxed text-muted">
              프로젝트마다 쓴 기술, 내린 결정, 만든 효과를 노드로 연결했습니다. 같은 기술을 쓴
              프로젝트끼리 자연스럽게 묶입니다.
            </p>
            <dl className="mt-6 grid max-w-md grid-cols-3 gap-3">
              {[
                ["project", "프로젝트"],
                ["tech", "기술"],
                ["decision", "결정"],
              ].map(([type, label]) => (
                <div key={type} className="inset px-4 py-3">
                  <dt className="flex items-center gap-1.5 text-caption text-muted">
                    <span className="size-1.5 rounded-full" style={{ background: TYPE_META[type].color }} />
                    {label}
                  </dt>
                  <dd className="mt-1 text-heading font-bold tabular-nums">
                    {countOf(type)}
                    {type === "project" && upcoming.length > 0 && (
                      <span className="text-caption font-normal text-muted">{ideaSuffix(upcoming.length)}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <Link
              href="/graph"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#a78bfa]/40 bg-[#a78bfa]/10 min-h-11 px-5 py-2.5 text-body font-semibold text-[#c4b5fd] transition-colors hover:bg-[#a78bfa]/20"
            >
              <Share2 size={15} />
              지식 그래프 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ⑥ 운영 현황 */}
      <section aria-labelledby="ops-title">
        <SectionHead
          id="ops-title"
          label="Live operations"
          title="운영 현황"
          aside={
            <p className="flex items-center gap-2 text-body text-muted">
              <span className="size-1.5 rounded-full bg-green shadow-[0_0_8px_#22c55e]" />이 사이트는
              실제로 운영 중입니다
            </p>
          }
        />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <BoardCard calendar={calendar} />
          <PipelineCard pipeline={pipeline} />
        </div>
      </section>

      {/* ⑦ 연락 */}
      <section
        aria-labelledby="contact-title"
        className="relative overflow-hidden rounded-3xl border border-line px-6 py-10 text-center sm:px-10 sm:py-14"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(245,158,11,0.14) 0%, transparent 70%), #111624",
        }}
      >
        <p className="label text-accent/90">Contact</p>
        <h2 id="contact-title" className="mt-2 text-heading font-bold tracking-tight sm:text-page">
          이야기 나눠요
        </h2>
        <p className="mt-3 text-body text-muted">프로젝트나 채용 관련 문의는 이메일로 편하게 보내 주세요.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <CopyEmail
            parts={profile.emailParts}
            className="flex items-center gap-2 rounded-xl bg-accent min-h-11 px-5 py-2.5 text-body font-semibold text-bg transition hover:brightness-110"
          />
          <a
            href={profile.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 min-h-11 px-5 py-2.5 text-body font-semibold transition-colors hover:border-text/30"
          >
            <GitHubMark size={15} />
            GitHub
            <ArrowUpRight size={14} className="text-muted" />
          </a>
        </div>
        {/* 첫 방문 도착 연출 다시 보기: ?intro 로 새로 불러옴 (app/layout.js). 움직임 줄이기면 연출이 없으므로 숨김.
            연출은 문서를 새로 불러올 때만 재생되므로 <Link>(화면 안 이동) 대신 <a> 로 전체 새로 고침 */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/?intro"
          className="mt-5 inline-flex min-h-11 items-center px-2 text-caption text-muted underline-offset-4 transition-colors hover:text-text hover:underline motion-reduce:hidden"
        >
          인트로 다시 보기
        </a>
      </section>
    </div>
  );
}
