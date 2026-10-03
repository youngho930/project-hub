import "server-only";
import crypto from "node:crypto";
import { SAVABLE_INTRO_MODES } from "./arrival-script.js";
import { INTRO_KEY } from "./intro-setting.js";
import { settingsCommand, settingsWritable } from "./settings-store.js";

// 관리 화면(/status)의 "첫 방문 인트로" 저장 — app/api/intro/route.js 가 부른다.
// 로그인·세션 없이 비밀번호(HUB_ADMIN_PASSWORD)를 저장할 때마다 받는다.
// 지키는 것:
// - 이 사이트에서 보낸 요청만 (Origin 이 사이트 주소와 같아야 함)
// - 비밀번호·쓰기 토큰 환경변수가 비면 저장을 막고 서버 로그에 경고
// - 인트로 값은 warp / none 만. data 는 "준비 중"으로 거부, 그 밖의 값도 거부
// - 비밀번호는 timingSafeEqual 로 비교 (둘 다 SHA-256 으로 같은 길이로 맞춘 뒤)
// - 같은 IP 에서 15분 안에 5번까지 틀릴 수 있고, 6번째 틀리면 15분 동안 막음 (hub:settings: 아래 키로 셈)
// - 로그에는 성공·실패 여부와 바뀐 값만. 비밀번호·토큰·IP 원문은 남기지 않는다 (IP 는 해시 앞 8자만)
export const MAX_FAILS = 5;
export const WINDOW_SEC = 15 * 60;
const FAIL = "hub:settings:pwfail:";
const LOCK = "hub:settings:pwlock:";
const LABEL = { warp: "워프", none: "없음", data: "데이터" };

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
function passwordMatches(given, expected) {
  return crypto.timingSafeEqual(sha(given), sha(expected));   // 같은 길이(32바이트) 해시끼리 — 원문 길이와 상관없이 같은 시간
}
const ipKey = (ip) => crypto.createHash("sha256").update("hub-intro:" + String(ip || "unknown")).digest("hex").slice(0, 24);
const minutes = (sec) => Math.max(1, Math.ceil(sec / 60));
const reply = (status, body) => ({ status, body });

/**
 * @param {{ origin: string|null, allowedOrigins: string[], ip: string, body: any, now?: number, log?: Pick<Console,"info"|"warn"> }} req
 * @returns {Promise<{ status: number, body: object, saved?: { from: string, to: string } }>}
 */
export async function handleIntroSave({ origin, allowedOrigins, ip, body, now = Date.now(), log = console }) {
  // 1) 이 사이트에서 보낸 요청인지
  if (!origin || !allowedOrigins.includes(origin)) {
    log.warn("[intro-setting] 거부: 다른 사이트에서 온 요청");
    return reply(403, { error: "bad_origin", message: "이 사이트에서만 저장할 수 있어요." });
  }
  // 2) 환경변수 — 비어 있으면 저장 자체를 막는다
  const PASS = process.env.HUB_ADMIN_PASSWORD ?? "";
  if (!PASS || !settingsWritable()) {
    log.warn("[intro-setting] 경고: " + (!PASS ? "HUB_ADMIN_PASSWORD" : "HUB_SETTINGS_WRITE_TOKEN 또는 UPSTASH_REDIS_REST_URL") + " 이(가) 비어 있어 저장을 막음");
    return reply(503, { error: "not_configured", message: "서버에 저장 설정이 되어 있지 않아 저장할 수 없어요." });
  }
  // 3) 인트로 값
  const intro = body && typeof body.intro === "string" ? body.intro : "";
  if (intro === "data") {
    log.info("[intro-setting] 거부: data (준비 중)");
    return reply(422, { error: "not_ready", message: "데이터 인트로는 아직 준비 중이에요." });
  }
  if (!SAVABLE_INTRO_MODES.includes(intro)) {
    log.info("[intro-setting] 거부: 알 수 없는 인트로 값");
    return reply(400, { error: "bad_intro", message: "인트로 값이 올바르지 않아요." });
  }
  const given = body && typeof body.password === "string" ? body.password : "";
  if (!given) return reply(400, { error: "no_password", message: "비밀번호를 입력해 주세요." });

  // 4) 잠겨 있는지 (잠금 키에는 풀리는 시각을 넣는다)
  const ik = ipKey(ip);
  const lock = await settingsCommand(["GET", LOCK + ik]);
  const until = lock.ok ? Number(lock.result) || 0 : 0;
  if (until > now) {
    const sec = Math.ceil((until - now) / 1000);
    log.info("[intro-setting] 거부: 잠김 | ip#" + ik.slice(0, 8) + " | 남은 " + sec + "초");
    return reply(429, { error: "locked", retryAfterSec: sec, message: `비밀번호를 여러 번 틀려 잠겼어요. ${minutes(sec)}분 뒤에 다시 해 주세요.` });
  }

  // 5) 비밀번호
  if (!passwordMatches(given, PASS)) {
    const n = await settingsCommand(["INCR", FAIL + ik]);
    const fails = n.ok ? Number(n.result) || 0 : 0;
    if (fails === 1) await settingsCommand(["EXPIRE", FAIL + ik, String(WINDOW_SEC)]);
    if (fails > MAX_FAILS) {
      await settingsCommand(["SET", LOCK + ik, String(now + WINDOW_SEC * 1000), "EX", String(WINDOW_SEC)]);
      await settingsCommand(["DEL", FAIL + ik]);
      log.warn("[intro-setting] 비밀번호 " + fails + "번째 틀림 → 15분 잠금 | ip#" + ik.slice(0, 8));
      return reply(429, { error: "locked", retryAfterSec: WINDOW_SEC, message: "비밀번호를 여러 번 틀려 잠겼어요. 15분 뒤에 다시 해 주세요." });
    }
    const left = Math.max(0, MAX_FAILS - fails);
    log.info("[intro-setting] 비밀번호 틀림 | ip#" + ik.slice(0, 8) + " | 남은 " + left + "번" + (n.ok ? "" : " (횟수 저장 실패)"));
    return reply(401, { error: "wrong_password", attemptsLeft: left,
      message: left > 0 ? `비밀번호가 틀렸어요. ${left}번 더 틀리면 15분 동안 잠겨요.` : "비밀번호가 틀렸어요. 한 번 더 틀리면 15분 동안 잠겨요." });
  }

  // 6) 저장
  const prev = await settingsCommand(["GET", INTRO_KEY]);
  const from = prev.ok && (prev.result === "warp" || prev.result === "none") ? prev.result : "warp";
  const set = await settingsCommand(["SET", INTRO_KEY, intro]);
  if (!set.ok) {
    log.warn("[intro-setting] 저장 실패 (" + set.error + ")");
    return reply(502, { error: "store_failed", message: "설정을 저장하지 못했어요. 잠시 뒤 다시 해 주세요." });
  }
  await settingsCommand(["DEL", FAIL + ik]);
  log.info("[intro-setting] 저장 성공: " + from + " → " + intro);
  return {
    status: 200,
    body: { ok: true, intro, previous: from, message: `저장했어요: ${LABEL[intro]}. 지금부터 첫 화면을 새로 여는 방문자에게 적용돼요.` },
    saved: { from, to: intro },
  };
}
