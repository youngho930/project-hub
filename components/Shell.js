"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CommandPalette from "./search/CommandPalette";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// 사이드바 + 상단 바 + 본문 틀.
// 넓은 화면(lg 이상)은 사이드바 고정, 좁은 화면은 햄버거 버튼으로 여닫는 메뉴.
export default function Shell({ sidebar, projectNames, searchIndex, children }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / ⌘+K 로 검색 창 열고 닫기. 입력칸 안에서도 브라우저 기본 동작(주소창 검색) 대신 이 창을 엶
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMenuOpen(false);
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 다른 화면으로 이동하면 메뉴 닫기
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMenuOpen(false);
  }

  // 메뉴가 열려 있으면 Esc 로 닫고, 뒤 화면 스크롤 막기
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  return (
    <>
      <Sidebar {...sidebar} open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <div className="min-h-screen lg:ml-60">
        <Topbar
          projectNames={projectNames}
          menuOpen={menuOpen}
          onMenu={() => setMenuOpen((open) => !open)}
          onSearch={() => setSearchOpen(true)}
        />
        <main className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        index={searchIndex}
      />
    </>
  );
}
