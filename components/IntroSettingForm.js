"use client";

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

// 관리 화면(/status) "첫 방문 인트로" — 종류를 골라 비밀번호와 함께 저장한다 (app/api/intro/route.js).
// 로그인·세션은 없다. 비밀번호는 저장할 때마다 넣고, 보낸 뒤 입력칸에서 지운다.
// 비밀번호는 화면 상태(메모리)에만 잠깐 있고 localStorage·sessionStorage·쿠키에는 넣지 않는다.
const OPTIONS = [
  { value: "warp", label: "워프", desc: "별빛이 모였다가 열리는 지금의 연출", preview: "/?intro=warp" },
  { value: "data", label: "데이터", desc: "흩어진 업무 데이터가 성과 숫자로 모이는 연출", preview: "/?intro=data" },
  { value: "none", label: "없음", desc: "연출 없이 바로 첫 화면", preview: "/?intro=none" },
];
const LABEL = { warp: "워프", none: "없음", data: "데이터" };
// 서버가 안내 문구를 주지 못한 경우(JSON 이 아닌 응답 등)에만 쓰는 상태 코드별 안내
function fallbackMessage(status) {
  if (status === 403) return "접속 주소가 사이트 주소와 달라 저장할 수 없어요.";
  if (status === 429) return "요청이 너무 많아요. 잠시 뒤 다시 해 주세요.";
  if (status === 503 || status === 504) return "서버에 잠시 연결하지 못했어요. 잠시 뒤 다시 해 주세요.";
  if (status >= 500) return "서버에서 저장을 처리하지 못했어요. 계속되면 서버 로그를 확인해 주세요.";
  return `저장하지 못했어요 (${status}).`;
}

export default function IntroSettingForm({ current }) {
  const [saved, setSaved] = useState(current);
  const [choice, setChoice] = useState(current);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { kind: "ok" | "error", text }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const pw = password;
    setPassword(""); // 보낸 즉시 입력칸에서 지움
    if (!pw) {
      setResult({ kind: "error", text: "비밀번호를 입력해 주세요." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intro: choice, password: pw }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSaved(data.intro);
        setResult({ kind: "ok", text: data.message });
      } else {
        setResult({ kind: "error", text: typeof data.message === "string" && data.message ? data.message : fallbackMessage(res.status) });
      }
    } catch {
      setResult({ kind: "error", text: "서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-5" autoComplete="off">
      <p className="text-body">
        현재 값: <strong className="font-semibold">{LABEL[saved] ?? "워프"}</strong>
      </p>

      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">첫 방문 인트로 종류</legend>
        {OPTIONS.map((o) => (
          <div
            key={o.value}
            className={`inset flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 ${o.disabled ? "opacity-55" : ""}`}
          >
            <label className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 ${o.disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
              <input
                type="radio"
                name="intro"
                value={o.value}
                checked={choice === o.value}
                disabled={o.disabled || busy}
                onChange={() => setChoice(o.value)}
                className="h-5 w-5 shrink-0 accent-[var(--color-accent)]"
              />
              <span className="min-w-0">
                <span className="block text-body font-semibold">
                  {o.label}
                  {o.disabled && (
                    <span className="ml-2 rounded-md border border-line px-1.5 py-0.5 text-caption font-normal text-muted">준비 중</span>
                  )}
                  {saved === o.value && (
                    <span className="ml-2 text-caption font-normal text-green">현재</span>
                  )}
                </span>
                <span className="mt-0.5 block text-caption text-muted">{o.desc}</span>
              </span>
            </label>
            {o.preview ? (
              <a
                href={o.preview}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-line px-3 text-caption font-semibold transition-colors hover:border-text/30"
              >
                미리보기
                <ArrowUpRight size={13} className="text-muted" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex min-h-11 shrink-0 cursor-not-allowed items-center rounded-lg border border-line px-3 text-caption font-semibold text-muted"
              >
                미리보기
              </button>
            )}
          </div>
        ))}
      </fieldset>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">관리 비밀번호</span>
          <input
            type="password"
            name="intro-admin-key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리 비밀번호"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={busy}
            className="min-h-11 w-full rounded-lg border border-line bg-bg/60 px-3 text-body outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 shrink-0 rounded-lg bg-accent px-5 text-body font-semibold text-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "저장 중…" : "저장"}
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-5 text-caption ${result ? (result.kind === "ok" ? "text-green" : "text-red") : "text-muted"}`}
      >
        {result
          ? result.text
          : "저장하면 바로 다음 방문부터 적용돼요. 이미 열어 둔 화면은 새로 고침하면 바뀌어요."}
      </p>
    </form>
  );
}
