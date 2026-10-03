import "server-only";
import { cache } from "react";
import { normalizeIntroMode } from "./arrival-script.js";

// 첫 방문 인트로 설정 읽기 — 페이지를 만들 때(서버) 한 번 읽어 HTML 안 <head> 스크립트에 값으로 넣는다.
// 방문자 브라우저는 따로 물어보러 가지 않는다.
// - 읽기는 기존과 같은 읽기 전용 토큰(UPSTASH_REDIS_REST_READONLY_TOKEN)으로만 한다. 쓰기는 lib/settings-store.js 한 곳뿐
// - 값이 없거나, 설정이 비었거나, 읽기에 실패하면 warp (지금까지와 같은 연출)
// - 저장하면 app/api/intro/route.js 가 이 태그를 바로 만료시키고(expire 0) 페이지를 다시 만든다
export const INTRO_KEY = "hub:settings:intro";
export const INTRO_TAG = "hub-intro-setting";
const REVALIDATE = 600; // 10분 — 저장할 때는 태그로 바로 만료되므로 평소 읽기 주기만 정한다

export const getIntroMode = cache(async () => {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/$/, "");
  const token = (process.env.UPSTASH_REDIS_REST_READONLY_TOKEN ?? "").trim();
  if (!url || !token) return "warp";
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(INTRO_KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: REVALIDATE, tags: [INTRO_TAG] },
    });
    if (!res.ok) return "warp";
    const { result } = await res.json();
    return normalizeIntroMode(result);
  } catch {
    // 에러 객체에 주소가 섞일 수 있어 내용은 버리고 기본값
    return "warp";
  }
});
