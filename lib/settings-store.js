import "server-only";

// 설정 쓰기 — 쓰기 토큰(HUB_SETTINGS_WRITE_TOKEN)을 쓰는 곳은 이 파일 하나뿐이다.
// 쓰기 토큰은 데이터베이스 전체 권한이라(무료 플랜은 키 단위 권한(ACL)이 없음) 코드로 범위를 막는다:
// - 명령은 허용 목록(GET, SET, INCR, EXPIRE, TTL, DEL)만, 키는 하나만 받는 형태만
// - 키는 "hub:settings:" 아래의 정해진 이름만 (인트로 값, 비밀번호 실패 횟수, 잠금). hub:pipeline 등 다른 키는 어떤 경우에도 거부
// - 거부는 요청을 보내기 전에 한다 (네트워크로 나가지 않음)
// 주소·토큰은 로그와 에러 메시지에 쓰지 않는다.
export const SETTINGS_PREFIX = "hub:settings:";
const KEY_RE = /^hub:settings:(intro|pwfail:[a-f0-9]{24}|pwlock:[a-f0-9]{24})$/;
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

// 돌려주는 값: { ok: true, result } | { ok: false, error }
export async function settingsCommand(cmd) {
  assertAllowed(cmd);
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/$/, "");
  const token = (process.env.HUB_SETTINGS_WRITE_TOKEN ?? "").trim();
  if (!url || !token) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd.map(String)),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { ok: false, error: "store_error" };
    return { ok: true, result: data.result ?? null };
  } catch {
    return { ok: false, error: "store_unreachable" };
  }
}
