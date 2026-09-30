"use client";

import {
  Calendar,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Share2,
  SquareKanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// 연결 상태별 점 색 (Jira는 아직 연결 전이라 회색)
const DOT_COLOR = {
  연결됨: "bg-green",
  오류: "bg-red",
  미설정: "bg-muted/50",
};

function NavLink({ href, active, Icon, children, className = "" }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
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
    </Link>
  );
}

export default function Sidebar({
  groups,
  githubStatus = "미설정",
  calendarStatus = "미설정",
}) {
  const pathname = usePathname();
  const [closed, setClosed] = useState({});

  const sources = [
    { name: "GitHub", Icon: GitBranch, status: githubStatus },
    { name: "Calendar", Icon: Calendar, status: calendarStatus },
    { name: "Jira", Icon: SquareKanban, status: "연결 전" },
  ];

  const toggle = (name) =>
    setClosed((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col overflow-y-auto border-r border-line bg-bg px-4 py-5">
      <Link href="/" className="mb-6 px-3 text-base font-bold tracking-tight">
        Project Hub
      </Link>

      <NavLink href="/" active={pathname === "/"} Icon={LayoutGrid}>
        전체 보기
      </NavLink>
      <NavLink
        href="/graph"
        active={pathname === "/graph"}
        Icon={Share2}
        className="mt-0.5"
      >
        지식 그래프
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
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-muted hover:bg-line/40 hover:text-text"
              >
                <ChevronRight
                  size={14}
                  className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
                <FolderIcon size={16} />
                <span className="truncate">{group.name}</span>
                <span className="ml-auto text-xs font-semibold">
                  {group.projects.length}
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
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted"
            >
              <Icon size={16} />
              <span>{name}</span>
              {/* 마우스를 올리면 상태 글자 표시 */}
              <span className="ml-auto text-xs opacity-0 transition-opacity group-hover:opacity-100">
                {status}
              </span>
              <span
                aria-label={status}
                className={`size-2 shrink-0 rounded-full ${DOT_COLOR[status] ?? "bg-muted/50"}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
