"use client";

import { ChevronRight, Search } from "lucide-react";
import { usePathname } from "next/navigation";

function crumbsFor(pathname, projectNames) {
  if (pathname.startsWith("/projects/")) {
    const id = decodeURIComponent(pathname.split("/")[2] ?? "");
    return ["프로젝트", projectNames[id] ?? id];
  }
  return ["개요"];
}

export default function Topbar({ projectNames }) {
  const pathname = usePathname();
  const crumbs = ["워크스페이스", ...crumbsFor(pathname, projectNames)];

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-6 border-b border-line bg-bg/85 px-10 backdrop-blur">
      <nav aria-label="현재 위치">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={14} className="text-muted" />}
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "font-semibold" : "text-muted"}
                >
                  {crumb}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center gap-3">
        {/* 검색은 모양만 (다음 단계에서 동작) */}
        <div
          aria-hidden="true"
          className="flex h-9 w-60 items-center gap-2 rounded-lg border border-line bg-card px-3 text-sm text-muted"
        >
          <Search size={15} />
          <span>검색</span>
          <kbd className="ml-auto rounded border border-line bg-inset px-1.5 py-0.5 font-sans text-[10px]">
            Ctrl K
          </kbd>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green/10 px-3 py-1 text-xs font-semibold text-green">
          <span className="size-1.5 rounded-full bg-green" />
          live
        </span>
      </div>
    </header>
  );
}
