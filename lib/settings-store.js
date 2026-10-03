import "server-only";

// 설정 쓰기 — 쓰기 토큰(HUB_SETTINGS_WRITE_TOKEN)을 쓰는 곳은 이 파일 하나뿐이다.
// 쓰기 토큰은 데이터베이스 전체 권한이라(무료 플랜은 키 단위 권한(ACL)이 없음) 코드로 범위를 막는다:
// - 명령은 허용 목록(GET, SET, INCR, EXPIRE, TTL, DEL)만, 키는 하나만 받는 형태만
// - 키는 "hub:settings:" 아래의 정해진 이름만 (인트로 값, 비밀번호 실패 횟수, 잠금, 쓰기 점검용 __probe). hub:pipeline 등 다른 키는 어떤 경우에도 거부
// - 거부는 요청을 보내기 전에 한다 (네트워크로 나가지 않음)
// 주소·토큰은 로그와 에러 메시지에 쓰지 않는다.
export const SETTINGS_PREFIX = "hub:settings:";
const KEY_RE = /^hub:settings:(intro|__probe|pwfail:[a-f0-9]{24}|pwlock:[a-f0-9]{24})$/;
export const PROBE_KEY = SETTINGS_PREFIX + "__probe";
// a = 키 뒤의 인자들. 키가 둘 이상인 형태(DEL k1 k2 등)는 인자 개수로 막힌다
const COMMANDS = {
  GET: (a) => a.length === 0,
  TTL: (a) => a.length === 0,
  DEL: (a) => a.length === 0,
  INCR: (a) => a.length === 0,
  EXPIRE: (a) => a.length === 1 && isSeconds(a[0]),
  SET: (a) =>
    (a.length === 1 || (a.length === 3 && a[1] === "EX" && isSeconds(a[2]))) &&
    typeof a[0] === "string" && a[0].length <= 64,
};
const isSeconds = (v) => Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) <= 86400;

export class SettingsKeyBlocked extends Error {
  constructor(reason) {
    super("settings write blocked: " + reason);
    this.name = "SettingsKeyBlocked";
  }
}

// 허용되지 않으면 SettingsKeyBlocked 를 던진다
export function assertAllowed(cmd) {
  if (!Array.isArray(cmd) || cmd.length < 2) throw new SettingsKeyBlocked("bad command");
  const [name, key, ...args] = cmd;
  const check = COMMANDS[String(name).toUpperCase()];
  if (!check || String(name) !== String(name).toUpperCase()) throw new SettingsKeyBlocked("command not allowed");
  if (typeof key !== "string" || !KEY_RE.test(key)) throw new SettingsKeyBlocked("key not allowed");
  if (!check(args)) throw new SettingsKeyBlocked("arguments not allowed");
}

export function settingsWritable() {
  return !!((process.env.UPSTASH_REDIS_REST_URL ?? "").trim() && (process.env.HUB_SETTINGS_WRITE_TOKEN ?? "").trim());
}

// 실패 종류 (원인별로 나눈다 — 화면 안내와 로그에 쓴다):
// - not_configured     주소나 쓰기 토큰 환경변수가 비어 있음
// - store_denied       저장소가 명령을 권한 없음으로 거부 (NOPERM — 읽기 전용 토큰으로 쓰려 한 경우 등)
// - store_auth         토큰 자체가 틀림 (WRONGPASS, HTTP 401·403)
// - store_unreachable  연결 실패·시간 초과·저장소 쪽 5xx·429 (일시적)
// - store_error        그 밖의 거부
// code 는 Upstash 오류의 첫 낱말(NOPERM, WRONGPASS, ERR 등 대문자 코드)만 — 오류 원문·주소·토큰은 담지 않는다
function classify(status, message) {
  const word = String(message ?? "").trim().split(/\s+/)[0] ?? "";
  const code = /^[A-Z]{2,16}$/.test(word) ? word : null;
  if (code === "NOPERM") return { error: "store_denied", code, status };
  if (code === "WRONGPASS" || status === 401 || status === 403) return { error: "store_auth", code, status };
  if (status === 429 || status >= 500) return { error: "store_unreachable", code, status };
  return { error: "store_error", code, status };
}

// 돌려주는 값: { ok: true, result } | { ok: false, error, code?, status? }
export async function settingsCommand(cmd) {
  assertAllowed(cmd);
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/$/, "");
  const token = (process.env.HUB_SETTINGS_WRITE_TOKEN ?? "").trim();
  if (!url || !token) return { ok: false, error: "not_configured" };
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd.map(String)),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { ok: false, error: "store_unreachable", code: null, status: 0 };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) return { ok: false, ...classify(res.status, data.error) };
  return { ok: true, result: data.result ?? null };
}

// 쓰기 점검: hub:settings:__probe 에 시험으로 쓰고(60초 뒤 저절로 사라짐) 바로 지운다.
// 결과는 "성공" 또는 실패 코드(NOPERM 등)만 돌려준다 — 값·토큰은 담지 않는다
export async function probeWrite() {
  const set = await settingsCommand(["SET", PROBE_KEY, "1", "EX", "60"]);
  if (!set.ok) return { ok: false, step: "SET", error: set.error, code: set.code ?? null };
  const del = await settingsCommand(["DEL", PROBE_KEY]);
  if (!del.ok) return { ok: false, step: "DEL", error: del.error, code: del.code ?? null };
  return { ok: true };
}
