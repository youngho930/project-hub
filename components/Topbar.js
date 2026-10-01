"use client";

import { ChevronRight, Menu, Search } from "lucide-react";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

function crumbsFor(pathname, projectNames) {
  if (pathname.startsWith("/projects/")) {
    const id = decodeURIComponent(pathname.split("/")[2] ?? "");
    return ["프로젝트", projectNames[id] ?? id];
  }
  if (pathname === "/graph") return ["지식 그래프"];
  if (pathname === "/status") return ["관리"];
  return [];
}

// 맥이면 ⌘, 그 밖은 Ctrl (서버 렌더링에서는 Ctrl)
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const useShortcutLabel = () =>
  useSyncExternalStore(
    () => () => {},
    () => (isMac() ? "⌘ K" : "Ctrl K"),
    () => "Ctrl K"
  );

export default function Topbar({ projectNames, menuOpen = false, onMenu, onSearch }) {
  const shortcut = useShortcutLabel();
  const pathname = usePathname();
  // 첫 화면은 "홈" 하나, 다른 화면은 "홈 > …"
  const crumbs = ["홈", ...crumbsFor(pathname, projectNames)];

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-2">
        {/* 좁은 화면에서만 보이는 메뉴 버튼 */}
        <button
          type="button"
          onClick={onMenu}
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          className="-ml-3 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-line/40 hover:text-text lg:hidden"
        >
          <Menu size={20} />
        </button>
        <nav aria-label="현재 위치" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5 text-body">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li
                  key={i}
                  // 좁은 화면의 하위 화면에서는 첫 단계(홈)를 숨겨 자리 확보
                  className={`flex min-w-0 items-center gap-1.5 ${
                    i === 0 && crumbs.length > 1 ? "max-sm:hidden" : ""
                  }`}
                >
                  {i > 0 && (
                    <ChevronRight
                      size={14}
                      className={`shrink-0 text-muted ${i === 1 ? "max-sm:hidden" : ""}`}
                    />
                  )}
                  <span
                    aria-current={last ? "page" : undefined}
                    className={`truncate ${last ? "font-semibold" : "text-muted"}`}
                  >
                    {crumb}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* 검색: 넓은 화면은 글자와 단축키, 좁은 화면은 돋보기만 (누르는 영역 44px) */}
      <button
        type="button"
        onClick={onSearch}
        aria-label="검색 (Ctrl+K)"
        aria-keyshortcuts="Control+K Meta+K"
        className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/40 hover:text-text focus-visible:outline-2 focus-visible:outline-accent sm:h-9 sm:w-56 sm:justify-start sm:gap-2 sm:border sm:border-line sm:bg-card sm:px-3 sm:text-body"
      >
        <Search size={18} className="sm:size-[15px]" />
        <span className="hidden sm:inline">검색</span>
        <kbd className="ml-auto hidden rounded border border-line bg-inset px-1.5 py-0.5 font-sans text-label sm:inline">
          {shortcut}
        </kbd>
      </button>
    </header>
  );
}
