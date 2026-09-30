"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

// 조각을 다시 뒤집어 붙인 뒤 "@"로 합친다 (lib/profile.js 의 splitEmail 과 짝)
const join = (parts) =>
  parts.map((part) => [...part].reverse().join("")).join("");

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // 클립보드 API 를 못 쓰는 환경(http 등) 대비
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
  return Promise.resolve();
}

// 주소는 화면·HTML 에 나오지 않고, 누를 때 브라우저에서만 합쳐져 클립보드로 들어감
export default function CopyEmail({ parts, className = "" }) {
  const [state, setState] = useState("idle"); // idle | copied | failed

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [state]);

  if (!parts) return null;

  const onClick = () => {
    copyText(`${join(parts.user)}@${join(parts.domain)}`)
      .then(() => setState("copied"))
      .catch(() => setState("failed"));
  };

  return (
    <button type="button" onClick={onClick} className={className}>
      {state === "copied" ? <Check size={15} /> : <Copy size={15} />}
      {/* 누르면 잠깐 글자가 "복사됨"으로 바뀜 (화면 읽기 프로그램에도 알림) */}
      <span role="status" aria-live="polite">
        {state === "copied" ? "복사됨" : state === "failed" ? "복사 실패" : "이메일 복사"}
      </span>
    </button>
  );
}
