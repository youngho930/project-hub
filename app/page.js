import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Share2 } from "lucide-react";
import CopyEmail from "@/components/home/CopyEmail";
import ClampWords from "@/components/home/ClampWords";
import CountUp from "@/components/home/CountUp";
import GraphTeaser from "@/components/home/GraphTeaser";
import { ILLUSTRATIONS } from "@/components/illustrations";
import { TYPE_META } from "@/components/graph/types";
import { BoardCard, PipelineCard } from "@/components/OperationCards";
import StatusBadge from "@/components/StatusBadge";
import { getCalendarSummary } from "@/lib/calendar";
import { getGitHubStatus } from "@/lib/github";
import { getGraph } from "@/lib/graph";
import { getPipeline } from "@/lib/pipeline";
import { getPreview } from "@/lib/previews";
import { getProfile } from "@/lib/profile";
import { NEEDS_CHECK, getAllProjects } from "@/lib/projects";

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
        <h2 id={id} className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">
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

// 넓은 화면에서 두 칸을 차지하는 대표작. 값은 두 칸이 되기 시작하는 화면 크기.
//  - 3열(xl): 재고 대시보드·자비스 둘 다 두 칸 → 2+1, 2+1, 1+1+1 로 세 줄이 꽉 참
//  - 2열(sm~lg): 재고 대시보드만 두 칸 → 2, 1+1, 1+1, 1+1 로 빈칸 없음
const FEATURED = { "inventory-dashboard": "sm", jarvis: "xl" };

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
const THUMB_POSITION = { "inventory-dashboard": "object-left-top" };

const STATUS_RANK = { "개발 중": 1, "구상 중": 2 };

// 완성된 프로젝트 먼저, 개발 중·구상 중은 뒤로 (같은 단계 안에서는 order 순).
// 3열에서 대표작 두 개가 1·2번째 줄의 첫 칸(0번, 2번 자리)에 오도록 배치
function arrange(projects) {
  const ranked = [...projects].sort(
    (a, b) => (STATUS_RANK[a.status] ?? 0) - (STATUS_RANK[b.status] ?? 0)
  );
  const featured = ranked.filter((p) => FEATURED[p.id]);
  const rest = ranked.filter((p) => !FEATURED[p.id]);
  const [first, second] = featured;
  return [first, rest[0], second, rest[1], ...rest.slice(2)].filter(Boolean);
}

function ProjectCard({ project }) {
  const preview = getPreview(project.id);
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
            className={`object-cover ${THUMB_POSITION[project.id] ?? "object-center"} brightness-[0.72] saturate-[0.9] transition-[filter,transform] duration-300 group-hover:scale-[1.02] group-hover:brightness-100 group-hover:saturate-100 motion-reduce:transition-none`}
          />
        ) : Illustration ? (
          <span className="absolute inset-0 p-3 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
            <Illustration />
          </span>
        ) : (
          <span className="absolute inset-0 grid place-items-center">
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ borderColor: `${color}55`, color, background: `${color}14` }}
            >
              {project.group}
            </span>
          </span>
        )}
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
          <h3 className={`font-bold tracking-tight ${wide ? "text-lg" : "text-base"}`}>
            {project.name}
          </h3>
          <StatusBadge status={project.status} className="mt-0.5" />
        </div>
        {/* 최대 2줄, 단어 단위로 줄이고 말줄임 */}
        <ClampWords text={project.summary} className="mt-1.5 text-sm leading-relaxed text-muted" />

        {effect && (
          <p className="mt-4 flex items-baseline gap-2 text-sm">
            <span className="shrink-0 text-xs text-muted">{effect.label}</span>
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
                className="rounded-md border border-line bg-inset px-2 py-0.5 text-[11px] text-muted"
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
  const projects = getAllProjects();
  const nameOf = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const graph = getGraph();
  const countOf = (type) => graph.nodes.filter((node) => node.type === type).length;

  // 개수와 상태만 받음 (일정·공고 내용은 서버 밖으로 나오지 않음)
  const [githubStatus, calendar, pipeline] = await Promise.all([
    getGitHubStatus(),
    getCalendarSummary(),
    getPipeline(),
  ]);
  const sources = [
    { name: "GitHub", status: githubStatus },
    { name: "Calendar", status: calendar.status },
    { name: "Job Jarvis", status: pipeline.status },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-16 sm:space-y-20">
      {/* ① 소개 */}
      <section
        aria-labelledby="intro-title"
        className="relative overflow-hidden rounded-3xl border border-line px-6 py-12 sm:px-10 sm:py-16 lg:px-14"
        style={{
          background:
            "radial-gradient(60% 80% at 100% 0%, rgba(139,92,246,0.28) 0%, transparent 60%), radial-gradient(50% 70% at 0% 100%, rgba(245,158,11,0.16) 0%, transparent 60%), linear-gradient(180deg, #111624 0%, #0c1019 100%)",
        }}
      >
        {/* 은은한 점 격자 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_70%_at_70%_30%,black,transparent)]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="label flex items-center gap-2 text-accent">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_#f59e0b]" />
              Portfolio
            </p>
            <p className="mt-5 text-base font-semibold text-text/80 sm:text-lg">{profile.name}</p>
            <h1
              id="intro-title"
              className="mt-2 text-[2rem] leading-[1.2] font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.15]"
            >
              {profile.tagline}
            </h1>
            <p className="mt-5 text-sm text-muted sm:text-base">{profile.subline}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#projects"
                className="flex items-center gap-2 rounded-xl bg-accent min-h-11 px-5 py-2.5 text-sm font-semibold text-bg shadow-[0_8px_30px_-8px_#f59e0b] transition hover:brightness-110"
              >
                프로젝트 보기
                <ArrowDown size={15} />
              </a>
              <a
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 min-h-11 px-5 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:border-text/30"
              >
                <GitHubMark size={15} />
                GitHub
                <ArrowUpRight size={14} className="text-muted" />
              </a>
            </div>
          </div>

          {/* 연결 상태 (글자와 점만) */}
          <div className="shrink-0 rounded-2xl border border-line bg-bg/50 p-4 backdrop-blur sm:w-60">
            <p className="label flex items-center gap-2 text-green">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-green" />
              </span>
              Live
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {sources.map(({ name, status }) => (
                <li key={name} className="flex items-center gap-2.5">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${DOT_COLOR[status] ?? "bg-muted/50"}`}
                  />
                  <span>{name}</span>
                  <span className="ml-auto text-xs text-muted">{status}</span>
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
                  className="w-[6.5rem] shrink-0 bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-[2rem] leading-none font-bold tracking-tight text-transparent sm:w-auto sm:text-5xl sm:leading-tight"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold sm:mt-3">{item.label}</span>
                  <span className="mt-0.5 text-xs text-muted sm:mt-1">{item.detail}</span>
                  <span className="mt-4 hidden items-center gap-1 text-xs text-muted transition-colors group-hover:text-accent sm:flex">
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
          aside={<p className="text-sm text-muted">{projects.length}개 프로젝트</p>}
        />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {arrange(projects).map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
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
                <span className="font-mono text-xs text-accent/80">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-bold tracking-tight">{story.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{story.body}</p>
                <span className="mt-5 flex items-center gap-1 text-xs text-muted transition-colors group-hover:text-[#a78bfa]">
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
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
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
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-1.5 rounded-full" style={{ background: TYPE_META[type].color }} />
                    {label}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums">{countOf(type)}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/graph"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#a78bfa]/40 bg-[#a78bfa]/10 min-h-11 px-5 py-2.5 text-sm font-semibold text-[#c4b5fd] transition-colors hover:bg-[#a78bfa]/20"
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
            <p className="flex items-center gap-2 text-sm text-muted">
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
        <h2 id="contact-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          이야기 나눠요
        </h2>
        <p className="mt-3 text-sm text-muted">프로젝트나 채용 관련 문의는 이메일로 편하게 보내 주세요.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <CopyEmail
            parts={profile.emailParts}
            className="flex items-center gap-2 rounded-xl bg-accent min-h-11 px-5 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110"
          />
          <a
            href={profile.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-line bg-bg/60 min-h-11 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-text/30"
          >
            <GitHubMark size={15} />
            GitHub
            <ArrowUpRight size={14} className="text-muted" />
          </a>
        </div>
      </section>
    </div>
  );
}
