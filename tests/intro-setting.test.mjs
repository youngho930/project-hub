// 첫 방문 인트로 설정 테스트. 실행: node --conditions=react-server --test tests/
// 네트워크를 쓰지 않는다 — Upstash REST 는 가짜 fetch 로 흉내 낸다 (실제 데이터베이스에 쓰지 않음).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASSWORD = "test-admin-password-%$#";
const WRITE_TOKEN = "TEST-WRITE-TOKEN-abcdef123456";
const READ_TOKEN = "TEST-READ-TOKEN-zyx987";
const URL_ = "https://fake-upstash.test";
const ORIGIN = "https://project-hub-youngho.vercel.app";

/* ---------- 가짜 Upstash ---------- */
const store = new Map(); // key → { v, exp }
let clock = Date.UTC(2026, 9, 4, 3, 0, 0);
const sent = []; // { token, cmd } — 실제로 나간 요청
let readMode = "ok"; // ok | http500 | throw | badjson
const live = (k) => { const e = store.get(k); if (!e) return null; if (e.exp && e.exp <= clock) { store.delete(k); return null; } return e; };
function redis([c, k, ...a]) {
  if (c === "GET") return live(k)?.v ?? null;
  if (c === "SET") { const i = a.indexOf("EX"); store.set(k, { v: String(a[0]), exp: i >= 0 ? clock + Number(a[i + 1]) * 1000 : 0 }); return "OK"; }
  if (c === "INCR") { const e = live(k) ?? { v: "0", exp: 0 }; e.v = String(Number(e.v) + 1); store.set(k, e); return Number(e.v); }
  if (c === "EXPIRE") { const e = live(k); if (e) e.exp = clock + Number(a[0]) * 1000; return e ? 1 : 0; }
  if (c === "DEL") return store.delete(k) ? 1 : 0;
  if (c === "TTL") { const e = live(k); return e ? (e.exp ? Math.ceil((e.exp - clock) / 1000) : -1) : -2; }
  throw new Error("unexpected command " + c);
}
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const token = String(opts.headers?.Authorization ?? "").replace(/^Bearer /, "");
  if (u.startsWith(URL_ + "/get/")) {   // 읽기 (읽기 전용 토큰)
    sent.push({ token, cmd: ["GET", decodeURIComponent(u.slice((URL_ + "/get/").length))] });
    if (readMode === "throw") throw new Error("network down " + URL_);
    if (readMode === "http500") return { ok: false, status: 500, json: async () => ({ error: "x" }) };
    if (readMode === "badjson") return { ok: true, status: 200, json: async () => { throw new Error("bad json"); } };
    return { ok: true, status: 200, json: async () => ({ result: redis(["GET", decodeURIComponent(u.slice((URL_ + "/get/").length))]) }) };
  }
  if (u === URL_) {                      // 명령 (쓰기 토큰)
    const cmd = JSON.parse(opts.body);
    sent.push({ token, cmd });
    if (token !== WRITE_TOKEN) return { ok: false, status: 401, json: async () => ({ error: "unauthorized" }) };
    return { ok: true, status: 200, json: async () => ({ result: redis(cmd) }) };
  }
  throw new Error("unexpected url");
};

process.env.UPSTASH_REDIS_REST_URL = URL_;
process.env.UPSTASH_REDIS_REST_READONLY_TOKEN = READ_TOKEN;
process.env.HUB_SETTINGS_WRITE_TOKEN = WRITE_TOKEN;
process.env.HUB_ADMIN_PASSWORD = PASSWORD;

const { handleIntroSave, MAX_FAILS, WINDOW_SEC } = await import("../lib/intro-save.js");
const { getIntroMode, INTRO_KEY } = await import("../lib/intro-setting.js");
const { assertAllowed, settingsCommand, SettingsKeyBlocked } = await import("../lib/settings-store.js");
const { arrivalScript, normalizeIntroMode } = await import("../lib/arrival-script.js");

const logs = [];
const log = { info: (...a) => logs.push(a.join(" ")), warn: (...a) => logs.push(a.join(" ")) };
const save = (body, extra = {}) =>
  handleIntroSave({ origin: ORIGIN, allowedOrigins: [ORIGIN], ip: "203.0.113.7", body, now: clock, log, ...extra });

beforeEach(() => {
  store.clear(); sent.length = 0; logs.length = 0; readMode = "ok";
  clock = Date.UTC(2026, 9, 4, 3, 0, 0);
  process.env.HUB_ADMIN_PASSWORD = PASSWORD;
  process.env.HUB_SETTINGS_WRITE_TOKEN = WRITE_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = URL_;
  process.env.UPSTASH_REDIS_REST_READONLY_TOKEN = READ_TOKEN;
});

/* ---------- 첫 화면 head 스크립트를 흉내 내는 작은 브라우저 ---------- */
function runArrival(mode, { search = "", pathname = "/", visited = false, reduced = false } = {}) {
  const classes = new Set();
  const appended = [];
  const ls = new Map(visited ? [["hub-visited", "1"]] : []);
  const ctx = {
    location: { search, pathname },
    localStorage: { getItem: (k) => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)) },
    document: {
      documentElement: { classList: { add: (...c) => c.forEach((x) => classes.add(x)), remove: (...c) => c.forEach((x) => classes.delete(x)) }, style: { setProperty() {} } },
      head: { appendChild: (el) => appended.push(el.src) },
      body: null,
      createElement: () => ({ setAttribute() {}, style: {}, remove() {} }),
    },
    matchMedia: () => ({ matches: reduced }),
    performance: { now: () => 5 },
    addEventListener() {}, removeEventListener() {}, setTimeout() {}, devicePixelRatio: 3,
  };
  ctx.window = ctx;
  vm.runInNewContext(arrivalScript(mode), ctx);
  return { classes, appended, visited: ls.get("hub-visited") === "1", log: ctx.__hubIntroLog };
}

/* ===== 저장: 맞는 비밀번호 → 저장되고 첫 화면에 반영 ===== */
test("맞는 비밀번호로 저장 → 설정 키에 저장, 첫 화면을 만들 때 읽는 값과 head 스크립트에 반영", async () => {
  let r = await save({ intro: "none", password: PASSWORD });
  assert.equal(r.status, 200);
  assert.deepEqual(r.saved, { from: "warp", to: "none" });
  assert.equal(store.get(INTRO_KEY).v, "none");
  assert.match(r.body.message, /없음/);
  assert.equal(await getIntroMode(), "none");                          // 페이지를 만들 때 읽는 값 (읽기 전용 토큰)
  assert.ok(sent.filter((s) => s.cmd[0] === "GET" && s.cmd[1] === INTRO_KEY).some((s) => s.token === READ_TOKEN));
  const page = runArrival(await getIntroMode());
  assert.equal(page.classes.size, 0, "없음: 덮개 클래스 없음");
  assert.deepEqual(page.appended, [], "없음: 연출 파일을 불러오지 않음");
  r = await save({ intro: "warp", password: PASSWORD });
  assert.deepEqual(r.saved, { from: "none", to: "warp" });
  assert.equal(await getIntroMode(), "warp");
  assert.ok(runArrival("warp").appended.includes("/hero-intro.js"));
});

test("저장 성공 시 route.js 가 설정 캐시를 바로 만료하고 페이지를 다시 만들게 함", () => {
  const src = fs.readFileSync(path.join(ROOT, "app/api/intro/route.js"), "utf8");
  assert.match(src, /if \(out\.saved\) \{[\s\S]*revalidateTag\(INTRO_TAG, \{ expire: 0 \}\);[\s\S]*revalidatePath\("\/", "layout"\);[\s\S]*\}/);
});

/* ===== 비밀번호 틀림: 5번까지 → 6번째 잠금 → 15분 뒤 해제 ===== */
test("틀린 비밀번호 5번까지는 남은 횟수, 6번째에 15분 잠금, 잠긴 동안은 맞는 비밀번호도 거부, 15분 뒤 해제", async () => {
  const left = [];
  for (let i = 0; i < MAX_FAILS; i++) {
    const r = await save({ intro: "none", password: "wrong-" + i });
    assert.equal(r.status, 401);
    left.push(r.body.attemptsLeft);
  }
  assert.deepEqual(left, [4, 3, 2, 1, 0]);
  let r = await save({ intro: "none", password: "wrong-6" });
  assert.equal(r.status, 429);
  assert.equal(r.body.retryAfterSec, WINDOW_SEC);
  assert.match(r.body.message, /15분 뒤/);
  r = await save({ intro: "none", password: PASSWORD });
  assert.equal(r.status, 429, "잠긴 동안은 맞는 비밀번호도");
  assert.equal(store.has(INTRO_KEY), false, "잠긴 동안 저장 안 됨");
  clock += 14 * 60 * 1000;
  r = await save({ intro: "none", password: PASSWORD });
  assert.equal(r.status, 429);
  assert.match(r.body.message, /1분 뒤/);
  clock += 60 * 1000 + 1000;
  r = await save({ intro: "none", password: PASSWORD });
  assert.equal(r.status, 200, "15분 뒤 해제");
  assert.equal(store.get(INTRO_KEY).v, "none");
});

test("다른 IP 는 잠금 영향 없음, 성공하면 실패 횟수 초기화", async () => {
  for (let i = 0; i < 6; i++) await save({ intro: "none", password: "nope" });
  const other = await save({ intro: "none", password: PASSWORD }, { ip: "198.51.100.9" });
  assert.equal(other.status, 200);
  await save({ intro: "warp", password: "nope" }, { ip: "198.51.100.9" });
  const ok = await save({ intro: "warp", password: PASSWORD }, { ip: "198.51.100.9" });
  assert.equal(ok.status, 200);
  const again = await save({ intro: "warp", password: "nope" }, { ip: "198.51.100.9" });
  assert.equal(again.body.attemptsLeft, 4, "성공 뒤 다시 5번부터");
});

/* ===== 인트로 값 ===== */
test("data 는 준비 중으로 거부, 그 밖의 값도 모두 거부 (비밀번호 시도로 세지 않음)", async () => {
  let r = await save({ intro: "data", password: PASSWORD });
  assert.equal(r.status, 422);
  assert.match(r.body.message, /준비 중/);
  for (const intro of ["", "WARP", "Warp", "foo", "warp ", 1, null, undefined, ["warp"]]) {
    r = await save({ intro, password: PASSWORD });
    assert.equal(r.status, 400, "거부: " + JSON.stringify(intro));
  }
  r = await save(null);
  assert.equal(r.status, 400);
  assert.equal(store.has(INTRO_KEY), false);
  assert.equal([...store.keys()].some((k) => k.includes("pwfail")), false);
});

/* ===== 환경변수 ===== */
test("관리 비밀번호나 쓰기 토큰 환경변수가 비면 저장을 막고 경고", async () => {
  delete process.env.HUB_ADMIN_PASSWORD;
  let r = await save({ intro: "none", password: PASSWORD });
  assert.equal(r.status, 503);
  assert.ok(logs.some((l) => /경고: HUB_ADMIN_PASSWORD .*비어 있어 저장을 막음/.test(l)));
  process.env.HUB_ADMIN_PASSWORD = PASSWORD;
  delete process.env.HUB_SETTINGS_WRITE_TOKEN;
  r = await save({ intro: "none", password: PASSWORD });
  assert.equal(r.status, 503);
  assert.ok(logs.some((l) => /경고: HUB_SETTINGS_WRITE_TOKEN/.test(l)));
  assert.equal(sent.length, 0, "요청을 보내지 않음");
});

/* ===== Origin ===== */
test("다른 Origin 이나 Origin 없음은 거부 (비밀번호를 확인하지도 않음)", async () => {
  for (const origin of ["https://evil.example", "http://project-hub-youngho.vercel.app", "null", null, ""]) {
    const r = await save({ intro: "none", password: PASSWORD }, { origin });
    assert.equal(r.status, 403, "거부: " + origin);
  }
  assert.equal(sent.length, 0);
});

/* ===== 쓰기 범위 ===== */
test("쓰기 토큰은 hub:settings: 의 정해진 키에만 — hub:pipeline 등 다른 키·명령은 보내기 전에 거부", async () => {
  const blocked = [
    ["SET", "hub:pipeline", "x"], ["DEL", "hub:pipeline"], ["GET", "hub:pipeline"], ["INCR", "hub:pipeline"],
    ["EXPIRE", "hub:pipeline", "10"], ["SET", "hub:settings:other", "x"], ["SET", "hub:settings:intro:x", "x"],
    ["SET", "hub:settings:pwfail:short", "1"], ["SET", "HUB:SETTINGS:INTRO", "x"], ["set", "hub:settings:intro", "x"],
    ["FLUSHALL"], ["FLUSHDB", "hub:settings:intro"], ["KEYS", "hub:settings:intro"], ["EVAL", "hub:settings:intro", "0"],
    ["MSET", "hub:settings:intro", "x", "hub:pipeline", "y"], ["DEL", "hub:settings:intro", "hub:pipeline"],
    ["SET", "hub:settings:intro", "x", "EX", "999999"], ["SET", "hub:settings:intro", "x".repeat(100)], ["RENAME", "hub:settings:intro", "hub:pipeline"],
  ];
  for (const cmd of blocked) {
    assert.throws(() => assertAllowed(cmd), SettingsKeyBlocked, "거부: " + JSON.stringify(cmd));
    await assert.rejects(settingsCommand(cmd), SettingsKeyBlocked);
  }
  assert.equal(sent.length, 0, "거부한 명령은 네트워크로 나가지 않음");
  for (const cmd of [["GET", "hub:settings:intro"], ["SET", "hub:settings:intro", "warp"], ["INCR", "hub:settings:pwfail:" + "a".repeat(24)], ["SET", "hub:settings:pwlock:" + "b".repeat(24), "1", "EX", "900"]]) {
    assert.doesNotThrow(() => assertAllowed(cmd));
  }
});

test("저장 흐름 전체(성공·틀림·잠금)에서 쓰기 토큰으로 보낸 요청은 전부 hub:settings: 키뿐", async () => {
  for (let i = 0; i < 7; i++) await save({ intro: "none", password: "x" + i });
  clock += 16 * 60 * 1000;
  await save({ intro: "none", password: PASSWORD });
  const writes = sent.filter((s) => s.token === WRITE_TOKEN);
  assert.ok(writes.length > 10);
  assert.ok(writes.every((s) => s.cmd[1].startsWith("hub:settings:")), JSON.stringify(writes.map((s) => s.cmd[1])));
  assert.ok(!sent.some((s) => s.cmd.includes("hub:pipeline")));
});

test("쓰기 토큰 환경변수를 쓰는 코드는 lib/settings-store.js 한 파일뿐", () => {
  const hits = [];
  const walk = (dir) => {
    for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, f.name);
      if (f.isDirectory()) walk(rel);
      else if (/\.(m?js|jsx)$/.test(f.name) && /process\.env\.HUB_SETTINGS_WRITE_TOKEN/.test(fs.readFileSync(path.join(ROOT, rel), "utf8"))) hits.push(rel.replaceAll("\\", "/"));
    }
  };
  for (const d of ["app", "lib", "components", "public", "scripts"]) walk(d);
  assert.deepEqual(hits, ["lib/settings-store.js"]);
});

/* ===== 로그 ===== */
test("로그에 비밀번호·토큰·IP 원문이 없음 (성공·실패 여부와 바뀐 값만)", async () => {
  for (let i = 0; i < 6; i++) await save({ intro: "none", password: "wrong-" + PASSWORD });
  clock += 16 * 60 * 1000;
  await save({ intro: "none", password: PASSWORD });
  await save({ intro: "data", password: PASSWORD });
  await save({ intro: "none", password: PASSWORD }, { origin: "https://evil.example" });
  const all = logs.join("\n");
  for (const secret of [PASSWORD, "wrong-", WRITE_TOKEN, READ_TOKEN, "203.0.113.7", URL_]) assert.ok(!all.includes(secret), "로그에 있음: " + secret);
  assert.match(all, /저장 성공: warp → none/);
  assert.match(all, /비밀번호 틀림/);
  assert.match(all, /15분 잠금/);
});

/* ===== 읽기 실패 → warp ===== */
test("설정 읽기에 실패하면 warp (네트워크 오류·500·잘못된 응답·환경변수 없음·값 없음·모르는 값)", async () => {
  store.set(INTRO_KEY, { v: "none", exp: 0 });
  for (const m of ["throw", "http500", "badjson"]) {
    readMode = m;
    assert.equal(await getIntroMode(), "warp", m);
  }
  readMode = "ok";
  assert.equal(await getIntroMode(), "none");
  delete process.env.UPSTASH_REDIS_REST_READONLY_TOKEN;
  assert.equal(await getIntroMode(), "warp", "토큰 없음");
  process.env.UPSTASH_REDIS_REST_READONLY_TOKEN = READ_TOKEN;
  store.delete(INTRO_KEY);
  assert.equal(await getIntroMode(), "warp", "값 없음");
  store.set(INTRO_KEY, { v: "data", exp: 0 });
  assert.equal(await getIntroMode(), "warp", "data → warp");
  store.set(INTRO_KEY, { v: "<script>", exp: 0 });
  assert.equal(await getIntroMode(), "warp", "모르는 값");
  assert.ok(sent.filter((s) => s.cmd[0] === "GET").every((s) => s.token === READ_TOKEN), "읽기는 읽기 전용 토큰");
});

/* ===== head 스크립트: 종류·미리보기 주소·첫 방문·동작 줄이기·debug ===== */
test("head 스크립트: 설정값·미리보기 주소에 따라 연출을 켜고 끔", () => {
  const on = (r) => r.classes.has("hub-intro") && r.classes.has("hub-cover") && r.appended.includes("/hero-intro.js");
  const off = (r) => r.classes.size === 0 && r.appended.length === 0;
  assert.ok(on(runArrival("warp")), "warp 첫 방문");
  assert.ok(off(runArrival("none")), "none 첫 방문");
  assert.equal(runArrival("none").log.reason, "인트로 설정: 없음");
  assert.ok(off(runArrival("warp", { visited: true })), "warp 두 번째 방문");
  assert.ok(on(runArrival("warp", { visited: true, search: "?intro" })), "?intro = 설정(warp)");
  assert.ok(off(runArrival("none", { visited: true, search: "?intro" })), "?intro = 설정(none)");
  assert.ok(on(runArrival("none", { visited: true, search: "?intro=warp" })), "?intro=warp 는 설정과 상관없이");
  assert.ok(off(runArrival("warp", { visited: true, search: "?intro=none" })), "?intro=none 은 설정과 상관없이");
  assert.ok(on(runArrival("none", { visited: true, search: "?intro=data" })), "?intro=data → warp");
  assert.ok(on(runArrival("none", { visited: true, search: "?x=1&intro=warp&debug" })), "다른 값과 같이");
  assert.ok(off(runArrival("warp", { reduced: true })), "동작 줄이기면 생략");
  assert.equal(runArrival("warp", { reduced: true }).log.reason, "동작 줄이기 설정으로 생략");
  const g = runArrival("warp", { pathname: "/graph" });
  assert.ok(off(g) && g.visited, "다른 주소로 처음 들어오면 기록만");
  assert.ok(runArrival("none").visited, "none 이어도 첫 방문 기록");
  assert.equal(runArrival("warp", { search: "?intro&debug" }).log.debug, true);
  assert.equal(runArrival("none", { search: "?intro=warp&debug" }).log.mode, "warp");
  assert.equal(runArrival("warp", {}).log.debug, false);
});

test("설정값은 정해진 두 값만 스크립트에 들어감 (다른 문자열은 warp)", () => {
  assert.equal(normalizeIntroMode("none"), "none");
  for (const v of ["warp", "data", "", null, undefined, "</script><script>alert(1)</script>"]) assert.equal(normalizeIntroMode(v), "warp");
  assert.ok(!arrivalScript("</script>").includes("</script>"));
  assert.match(arrivalScript("none"), /^try\{var M="none",/);
});
