"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 900;

// "30초" → { number: 30, suffix: "초" }, "6개월+" → { number: 6, suffix: "개월+" }
function parse(value) {
  const match = /^(\d+(?:\.\d+)?)(.*)$/.exec(String(value));
  return match ? { number: Number(match[1]), suffix: match[2] } : null;
}

// 화면에 들어오면 0에서 목표 숫자까지 짧게 올라감.
// data-count="pending" 인 동안은 CSS(globals.css .count-up)가 움직임 허용 환경에서만 글자를 숨김:
//  - 움직임 허용: 시작 전에는 안 보이다가 0부터 올라감 (최종 값이 먼저 비치는 깜빡임 없음)
//  - 움직임 줄이기: 처음부터 최종 값 (자바스크립트가 아무것도 하지 않음)
//  - 자바스크립트가 없으면: <noscript> 스타일로 최종 값 표시
export default function CountUp({ value, className = "" }) {
  const parsed = parse(value);
  const ref = useRef(null);
  const [shown, setShown] = useState(null); // null = 최종 값
  const [phase, setPhase] = useState(parsed ? "pending" : "done"); // pending | run | done

  useEffect(() => {
    const el = ref.current;
    if (!parsed || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    // 첫 방문 data 인트로 중이면 연출이 숫자를 모아 이 자리에서 진짜 카드로 바뀌므로 올라가는 움직임 없이 최종 값
    // (public/hero-data.js — <html class="hub-data"> 는 연출이 끝나면 없어짐)
    if (document.documentElement.classList.contains("hub-data")) {
      frame = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(frame);
    }
    const run = () => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        if (t < 1) {
          setShown(Math.round(parsed.number * eased));
          setPhase("run");
          frame = requestAnimationFrame(tick);
        } else {
          setShown(null);
          setPhase("done");
        }
      };
      frame = requestAnimationFrame(tick);
    };

    // IntersectionObserver 가 없으면 바로 최종 값
    if (typeof IntersectionObserver === "undefined") {
      frame = requestAnimationFrame(() => setPhase("done"));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // 값이 바뀔 일은 없어 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={ref} data-count={phase} className={`count-up tabular-nums ${className}`}>
      {parsed && shown !== null ? `${shown}${parsed.suffix}` : value}
    </span>
  );
}
