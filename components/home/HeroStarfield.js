"use client";

import { useEffect } from "react";

// 소개 카드 별 배경(public/hero-stars.js)과 화면 전체 워프(public/hero-intro.js)를 불러옴.
// 첫 화면 그리기를 막지 않도록 브라우저가 한가할 때 불러옴. 첫 방문 도착 연출이면
// app/layout.js 의 <head> 스크립트가 hero-intro.js 를 이미 불러왔으므로 다시 받지 않음
function loadScript(src, globalName) {
  if (window[globalName]) return Promise.resolve();
  let script = document.querySelector(`script[src="${src}"]`);
  if (!script) {
    script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  }
  return new Promise((resolve, reject) => {
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", reject, { once: true });
  });
}

export default function HeroStarfield({ targetId }) {
  useEffect(() => {
    // 화면 준비(하이드레이션) 끝 신호: 첫 방문 도착 연출이 이 뒤에 움직이기 시작 (public/hero-intro.js)
    window.__hubHydrated = true;
    window.dispatchEvent(new Event("hub:hydrated"));
    const section = document.getElementById(targetId);
    if (!section) return;
    let cancelled = false;
    const run = () => {
      // 화면 전체 도착 연출 중이면 끝난 뒤에 (연출 프레임을 빼앗지 않게)
      if (document.documentElement.classList.contains("hub-intro")) {
        timer = setTimeout(run, 300);
        return;
      }
      loadScript("/hero-stars.js", "HubStars")
        .then(() => {
          if (!cancelled) window.HubStars.mount(section);
        })
        .catch(() => {});
      loadScript("/hero-intro.js", "HubIntro").catch(() => {});
    };
    let idle = 0;
    let timer = 0;
    if ("requestIdleCallback" in window) {
      idle = window.requestIdleCallback(run, { timeout: 1500 });
    } else {
      timer = setTimeout(run, 200);
    }
    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback(idle);
      clearTimeout(timer);
      section.__hubStars?.();
    };
  }, [targetId]);

  return null;
}
