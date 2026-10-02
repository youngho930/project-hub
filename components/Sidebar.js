"use client";

import {
  Briefcase,
  Calendar,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Gauge,
  Share2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSitePathname } from "@/lib/use-site-pathname";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import StatusBadge from "./StatusBadge";
import { ideaSuffix, isIdea } from "@/lib/project-count";

// 연결 상태별 점 색
const DOT_COLOR = {
  연결됨: "bg-green",
  오류: "bg-red",
  미설정: "bg-muted/50",
  지연: "bg-orange",
};

function NavLink({ href, active, Icon, badge, children, className = "" }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-body transition-colors ${
        active
          ? "bg-line/70 font-semibold text-text"
          : "text-muted hover:bg-line/40 hover:text-text"
      } ${className}`}
    >
      {active && (
        <span className="absolute inset-y-1.5 -left-4 w-[3px] rounded-r bg-accent" />
      )}
      <Icon size={16} className={active ? "text-accent" : ""} />
      <span className="truncate">{children}</span>
      {badge}
    </Link>
  );
}

// 넓은 화면(lg 이상)인지. 서버 렌더링에서는 넓은 화면으로 보고 사이드바를 그대로 둠
const WIDE = "(min-width: 1024px)";
const subscribeWide = (callback) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const useWide = () =>
  useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);

export default function Sidebar({
  groups,
  githubStatus = "미설정",
  calendarStatus = "미설정",
  pipelineStatus = "미설정",
  open = false,
  onClose,
}) {
  const pathname = useSitePathname();
  const [closed, setClosed] = useState({});
  // 좁은 화면에서 닫혀 있으면 화면 밖에 있으므로 Tab·화면 읽기 대상에서 뺌 (열리면 다시 포함)
  const wide = useWide();
  const hiddenOffCanvas = !wide && !open;

  // 좁은 화면에서 메뉴를 열면 사이드바 첫 링크로 포커스를 옮기고, 닫으면 원래 버튼으로 돌려줌
  const asideRef = useRef(null);
  useEffect(() => {
    if (wide || !open) return;
    const previous = document.activeElement;
    const aside = asideRef.current;
    aside?.querySelector("a[href], button")?.focus();
    return () => {
      const lost = document.activeElement === document.body || aside?.contains(document.activeElement);
      if (previous instanceof HTMLElement && lost) {
        previous.focus();
      }
    };
  }, [wide, open]);

  const sources = [
    { name: "GitHub", Icon: GitBranch, status: githubStatus },
    { name: "Calendar", Icon: Calendar, status: calendarStatus },
    { name: "Job Jarvis", Icon: Briefcase, status: pipelineStatus },
  ];

  const toggle = (name) =>
    setClosed((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    // 좁은 화면(lg 미만)에서는 왼쪽 밖에 숨어 있다가 open 이면 밀려 들어옴
    <aside
      ref={asideRef}
      id="sidebar"
      inert={hiddenOffCanvas}
      aria-hidden={hiddenOffCanvas || undefined}
      className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-y-auto border-r border-line bg-bg px-4 py-5 transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="px-3 text-title font-bold tracking-tight">
          Project Hub
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="-mr-2 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-line/40 hover:text-text lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <NavLink href="/" active={pathname === "/"} Icon={LayoutGrid}>
        홈
      </NavLink>
      <NavLink
        href="/graph"
        active={pathname === "/graph"}
        Icon={Share2}
        className="mt-0.5"
      >
        지식 그래프
      </NavLink>
      <NavLink
        href="/status"
        active={pathname === "/status"}
        Icon={Gauge}
        className="mt-0.5"
      >
        관리
      </NavLink>

      <p className="label mt-7 mb-2 px-3">Projects</p>
      <nav className="space-y-1">
        {groups.map((group) => {
          const isOpen = !closed[group.name];
          const FolderIcon = isOpen ? FolderOpen : Folder;
          return (
            <div key={group.name}>
              <button
                type="button"
                onClick={() => toggle(group.name)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-body text-muted hover:bg-line/40 hover:text-text"
              >
                <ChevronRight
                  size={14}
                  className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
                <FolderIcon size={16} />
                <span className="truncate">{group.name}</span>
                {/* 만든 것 수 + " · 구상 n" (첫 화면·지식 그래프와 같은 표기, 목록 줄 수와도 맞음) */}
                <span className="ml-auto shrink-0 text-caption font-semibold">
                  {group.projects.filter((p) => !isIdea(p)).length}
                  <span className="font-normal">
                    {ideaSuffix(group.projects.filter(isIdea).length)}
                  </span>
                </span>
              </button>

              {isOpen && (
                <ul className="mt-0.5 space-y-0.5">
                  {group.projects.map((project) => {
                    const href = `/projects/${project.id}`;
                    return (
                      <li key={project.id}>
                        <NavLink
                          href={href}
                          active={pathname === href}
                          Icon={FileText}
                          badge={<StatusBadge status={project.status} className="ml-auto" />}
                          className="pl-8"
                        >
                          {project.name}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        <p className="label mb-2 px-3">Sources</p>
        <ul className="space-y-0.5">
          {sources.map(({ name, Icon, status }) => (
            <li
              key={name}
              title={`${name}: ${status}`}
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-body text-muted"
            >
              <Icon size={16} />
              <span>{name}</span>
              {/* 마우스를 올리면 상태 글자 표시 (화면 읽기 프로그램은 항상 읽음). 옆 점은 장식 */}
              <span className="ml-auto text-caption opacity-0 transition-opacity group-hover:opacity-100">
                {status}
              </span>
              <span
                aria-hidden="true"
                className={`size-2 shrink-0 rounded-full ${DOT_COLOR[status] ?? "bg-muted/50"}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
