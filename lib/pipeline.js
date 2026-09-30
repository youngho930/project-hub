import "server-only";
import { cache } from "react";

// Job Jarvis 가 매일 9시에 Upstash 에 올리는 지원 단계별 개수 (hub:pipeline)
const KEY = "hub:pipeline";
const REVALIDATE = 600; // 10분
const STALE_MS = 2 * 24 * 60 * 60 * 1000; // 2일 넘게 갱신이 없으면 "지연"
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const PIPELINE_STATUS = {
  connected: "연결됨",
  stale: "지연",
  unset: "미설정",
  error: "오류",
};

export const STAGES = ["saved", "applied", "screening", "interview", "result"];

const EMPTY = Object.fromEntries(STAGES.map((stage) => [stage, 0]));

const toCount = (value) =>
  Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

// "M/D HH:mm" (한국 시간). 서버가 UTC 여도 +9 로 계산
export function formatKst(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms + KST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// 읽기 전용 토큰으로 GET 만 한다. 주소·토큰은 로그·에러 메시지에 쓰지 않음.
export const getPipeline = cache(async () => {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/$/, "");
  const token = (process.env.UPSTASH_REDIS_REST_READONLY_TOKEN ?? "").trim();
  if (!url || !token) {
    return { status: PIPELINE_STATUS.unset, counts: EMPTY, updatedAt: null };
  }

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) throw new Error("지원 현황 요청 실패");
    const { result } = await res.json();
    if (typeof result !== "string") throw new Error("지원 현황 값 없음");

    const data = JSON.parse(result);
    const counts = Object.fromEntries(
      STAGES.map((stage) => [stage, toCount(data[stage])])
    );
    const updatedAt = typeof data.updated_at === "string" ? data.updated_at : null;
    const updatedMs = updatedAt ? Date.parse(updatedAt) : NaN;
    // updated_at 은 +09:00 이 붙은 시각이라 절대 시각으로 비교하면 한국 시간 기준과 같음
    const stale = Number.isNaN(updatedMs) || Date.now() - updatedMs > STALE_MS;

    return {
      status: stale ? PIPELINE_STATUS.stale : PIPELINE_STATUS.connected,
      counts,
      updatedAt,
    };
  } catch {
    // 에러 객체에 주소가 섞일 수 있어 내용은 버리고 상태만 반환
    return { status: PIPELINE_STATUS.error, counts: EMPTY, updatedAt: null };
  }
});
