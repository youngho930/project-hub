import "server-only";
import { cache } from "react";

// Job Jarvis 가 매일 9시에 Upstash 에 올리는 개수 (hub:pipeline).
// 공개 사이트라 개인 구직 현황(지원·서류·면접·결과)은 여기서 읽자마자 버리고,
// 시스템이 한 일(저장한 공고 수)과 갱신 시각만 밖으로 내보냄 → 화면·페이지 소스·RSC 데이터에 없음
const KEY = "hub:pipeline";
const REVALIDATE = 600; // 10분
// 2일 넘게 갱신이 없으면 "대기": Job Jarvis 는 PC 작업 스케줄러로 돌아 PC 가 꺼진 동안 멈추는 게 정상이라
// 고장(오류)처럼 보이지 않게 회색 점. 값을 아예 못 읽은 경우만 "오류"
const STALE_MS = 2 * 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const PIPELINE_STATUS = {
  connected: "연결됨",
  stale: "대기",
  unset: "미설정",
  error: "오류",
};

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
    return { status: PIPELINE_STATUS.unset, saved: null, updatedAt: null };
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
    const saved = toCount(data.saved);
    const updatedAt = typeof data.updated_at === "string" ? data.updated_at : null;
    const updatedMs = updatedAt ? Date.parse(updatedAt) : NaN;
    // updated_at 은 +09:00 이 붙은 시각이라 절대 시각으로 비교하면 한국 시간 기준과 같음
    const stale = Number.isNaN(updatedMs) || Date.now() - updatedMs > STALE_MS;

    return {
      status: stale ? PIPELINE_STATUS.stale : PIPELINE_STATUS.connected,
      saved,
      updatedAt,
    };
  } catch {
    // 에러 객체에 주소가 섞일 수 있어 내용은 버리고 상태만 반환
    return { status: PIPELINE_STATUS.error, saved: null, updatedAt: null };
  }
});
