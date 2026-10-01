"use client";

import { useLayoutEffect, useRef, useState } from "react";

// 최대 lines 줄까지 보여주되, 넘치면 단어(띄어쓰기) 단위로 줄이고 "…"를 붙인다.
// CSS line-clamp 는 단어 중간("알려주…")에서 자르므로, 화면 밖 복사본으로 높이를 재서 정한다.
// 서버 HTML 에는 전체 문장 + line-clamp 가 들어가 있어, 자바스크립트 전에도 2줄로 보임.
export default function ClampWords({ text, lines = 2, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(text);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = text.split(/\s+/);
    let lastWidth = -1;

    const fit = () => {
      const width = el.clientWidth;
      if (width === lastWidth || width === 0) return;
      lastWidth = width;

      const style = getComputedStyle(el);
      const probe = document.createElement("div");
      for (const key of ["font", "letterSpacing", "wordBreak", "overflowWrap", "lineHeight"]) {
        probe.style[key] = style[key];
      }
      Object.assign(probe.style, { position: "absolute", visibility: "hidden", left: "-9999px", top: "0", width: `${width}px` });
      document.body.appendChild(probe);
      const lineHeight = parseFloat(style.lineHeight) || 20;
      const fits = (value) => {
        probe.textContent = value;
        return probe.scrollHeight <= lineHeight * lines + 1;
      };

      let result = text;
      if (!fits(text)) {
        // 들어가는 가장 긴 단어 수를 이분 탐색
        let lo = 1;
        let hi = words.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (fits(`${words.slice(0, mid).join(" ")}…`)) lo = mid;
          else hi = mid - 1;
        }
        result = `${words.slice(0, lo).join(" ").replace(/[,·.]+$/, "")}…`;
      }
      probe.remove();
      setShown(result);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, lines]);

  return (
    <p ref={ref} title={shown !== text ? text : undefined} className={`line-clamp-2 ${className}`}>
      {shown}
    </p>
  );
}
