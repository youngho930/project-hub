// 노션 "오늘 한눈에" 위젯 숫자(/api/briefing) 테스트. 실행: node --conditions=react-server --import ./tests/setup.mjs --test "tests/*.test.mjs"
// 네트워크를 쓰지 않는다 — Upstash 와 구글 캘린더(ICS)는 가짜 fetch 로 흉내 낸다.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const UPSTASH = "https://fake-upstash.test";
const ICS = "https://fake-calendar.test/basic.ics";
const HOUR = 60 * 60 * 1000;
const KST = 9 * HOUR;

// 한국 시각 "YYYY-MM-DDTHH:mm:ss+09:00" (Job Jarvis 가 올리는 updated_at 모양)
const kstIso = (ms) => new Date(ms + KST).toISOString().slice(0, 19) + "+09:00";
// ICS 용 UTC 시각 "YYYYMMDDTHHmmssZ"
const icsUtc = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
// 한국 날짜 기준 오늘 h시의 절대 시각
const kstToday = (h) => {
  const d = new Date(Date.now() + KST);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h) - KST;
};

let pipelineValue = null; // Upstash 에 들어 있는 hub:pipeline 문자열
let upstashMode = "ok"; // ok | http500
let icsText = "";

globalThis.fetch = async (url) => {
  const u = String(url);
  if (u === `${UPSTASH}/get/${encodeURIComponent("hub:pipeline")}`) {
    if (upstashMode === "http500") return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ result: pipelineValue }) };
  }
  if (u === ICS) return { ok: true, status: 200, text: async () => icsText };
  throw new Error("unexpected url");
};

process.env.UPSTASH_REDIS_REST_URL = UPSTASH;
process.env.UPSTASH_REDIS_REST_READONLY_TOKEN = "TEST-READ-TOKEN";
process.env.GOOGLE_CALENDAR_ICS_URL = ICS;

const { buildBriefing, getBriefing } = await import("../lib/briefing.js");
const { getPipeline, getPipelineDetail } = await import("../lib/pipeline.js");
const { GET } = await import("../app/api/briefing/route.js");

const NOW = Date.UTC(2026, 9, 12, 7, 30); // 2026-10-12 16:30 KST
const CAL = { status: "연결됨", counts: { today: 2, week: 5, later: 9 } };
const jobs = (over = {}) => ({
  status: "연결됨", saved: 18, newToday: 4, dueSoon: 3,
  updatedAt: "2026-10-12T09:02:11+09:00", ...over,
});

beforeEach(() => {
  upstashMode = "ok";
  pipelineValue = JSON.stringify({
    saved: 18, applied: 2, screening: 1, interview: 1, result: 0,
    new_today: 4, due_soon: 3, updated_at: kstIso(kstToday(9)),
  });
  icsText = [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "BEGIN:VEVENT", "UID:a@test", `DTSTART:${icsUtc(kstToday(10))}`, `DTEND:${icsUtc(kstToday(11))}`, "SUMMARY:비밀 일정 제목", "END:VEVENT",
    "BEGIN:VEVENT", "UID:b@test", `DTSTART:${icsUtc(kstToday(10) + 2 * 24 * HOUR)}`, `DTEND:${icsUtc(kstToday(11) + 2 * 24 * HOUR)}`, "SUMMARY:다른 일정", "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
});

test("오늘 수집된 값: 새 공고·마감 임박·지원 대기 개수를 그대로 보여 준다", () => {
  const b = buildBriefing(CAL, jobs(), NOW);
  assert.deepEqual(b.calendar, { status: "연결됨", today: 2, week: 5 });
  assert.deepEqual(b.jobs, {
    status: "연결됨", saved: 18, newToday: 4, dueSoon: 3,
    collectedToday: true, updatedAt: "2026-10-12T09:02:11+09:00",
  });
});

test("오늘 아직 수집 전이면(어제 값) 새 공고는 0, 나머지는 마지막 값", () => {
  const b = buildBriefing(CAL, jobs({ updatedAt: "2026-10-11T23:30:00+09:00" }), Date.UTC(2026, 9, 11, 15, 10)); // 10/12 00:10 KST
  assert.equal(b.jobs.collectedToday, false);
  assert.equal(b.jobs.newToday, 0);
  assert.equal(b.jobs.saved, 18);
  assert.equal(b.jobs.dueSoon, 3);
});

test("오늘 수집 여부는 UTC 가 아니라 한국 날짜로 판단한다", () => {
  // 10/12 08:50 KST(= 10/11 23:50 UTC) 에 올린 값을 10/12 23:10 KST(= 10/12 14:10 UTC) 에 보면 UTC 로는 다른 날, 한국 날짜로는 같은 날
  assert.equal(buildBriefing(CAL, jobs({ updatedAt: "2026-10-12T08:50:00+09:00" }), Date.UTC(2026, 9, 12, 14, 10)).jobs.collectedToday, true);
  // 10/11 23:50 KST 에 올린 값을 10/12 00:30 KST 에 보면 다른 날
  assert.equal(buildBriefing(CAL, jobs({ updatedAt: "2026-10-11T23:50:00+09:00" }), Date.UTC(2026, 9, 11, 15, 30)).jobs.collectedToday, false);
});

test("대기(PC 꺼짐): 마지막 값은 보여 주고 새 공고는 0", () => {
  const b = buildBriefing(CAL, jobs({ status: "대기", updatedAt: "2026-10-10T09:01:40+09:00" }), NOW);
  assert.equal(b.jobs.status, "대기");
  assert.equal(b.jobs.newToday, 0);
  assert.equal(b.jobs.saved, 18);
  assert.equal(b.jobs.updatedAt, "2026-10-10T09:01:40+09:00");
});

test("오류·미설정이면 숫자는 모두 null", () => {
  for (const status of ["오류", "미설정"]) {
    const b = buildBriefing({ status, counts: { today: 0, week: 0, later: 0 } },
      { status, saved: null, updatedAt: null, newToday: null, dueSoon: null }, NOW);
    assert.deepEqual(b.calendar, { status, today: null, week: null });
    assert.deepEqual(b.jobs, { status, saved: null, newToday: null, dueSoon: null, collectedToday: false, updatedAt: null });
  }
});

test("새 개수를 보내기 전의 Job Jarvis 값이면 새 공고·마감 임박은 null (0 과 구분)", async () => {
  pipelineValue = JSON.stringify({ saved: 7, applied: 1, updated_at: kstIso(kstToday(9)) });
  const d = await getPipelineDetail();
  assert.equal(d.newToday, null);
  assert.equal(d.dueSoon, null);
  const b = buildBriefing(CAL, d, Date.now());
  assert.equal(b.jobs.newToday, null);
  assert.equal(b.jobs.saved, 7);
});

test("첫 화면용 getPipeline 은 지금처럼 상태·저장 수·갱신 시각만", async () => {
  assert.deepEqual(Object.keys(await getPipeline()).sort(), ["saved", "status", "updatedAt"]);
});

test("API 응답: 개수만, 일정 제목·지원 단계별 개수는 없음, 캐시 안 함", async () => {
  const res = await GET();
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.deepEqual(body.calendar, { status: "연결됨", today: 1, week: 1 });
  assert.equal(body.jobs.newToday, 4);
  assert.equal(body.jobs.dueSoon, 3);
  assert.equal(body.jobs.collectedToday, true);
  const text = JSON.stringify(body);
  for (const secret of ["비밀 일정 제목", "applied", "screening", "interview", "result"]) {
    assert.equal(text.includes(secret), false, `${secret} 이(가) 응답에 있음`);
  }
  assert.deepEqual(await getBriefing(), body);
});

test("Upstash 를 못 읽어도 응답은 나가고 공고 숫자만 비어 있다", async () => {
  upstashMode = "http500";
  const body = await (await GET()).json();
  assert.equal(body.jobs.status, "오류");
  assert.equal(body.jobs.newToday, null);
  assert.equal(body.calendar.today, 1);
});
