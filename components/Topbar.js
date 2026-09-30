"use client";

import { ChevronRight, Menu } from "lucide-react";
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

// 검색창은 다음 작업에서 실제 기능으로 만들 때 다시 추가 (오른쪽 live 배지는 없앰)
export default function Topbar({ projectNames, menuOpen = false, onMenu }) {
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
          className="-ml-1.5 shrink-0 rounded-lg p-1.5 text-muted hover:bg-line/40 hover:text-text lg:hidden"
        >
          <Menu size={20} />
        </button>
        <nav aria-label="현재 위치" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm">
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
    </header>
  );
}
