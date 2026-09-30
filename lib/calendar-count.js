import ICAL from "ical.js";

// ICS 문자열에서 한국 날짜 기준 일정 개수만 계산한다 (제목·장소 등 내용은 반환하지 않음).
// 서버의 lib/calendar.js 에서만 불러 쓴다.

const DAY_MS = 24 * 60 * 60 * 1000;
// 한국은 1988년 이후 서머타임이 없어 항상 UTC+9 → 서버가 UTC여도 날짜가 밀리지 않음
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_DAYS = 7; // 이번 주: 내일부터 7일 안
const RANGE_DAYS = 30; // 나중에: 8일부터 30일 안 (그 뒤는 세지 않음)
const MAX_OCCURRENCES = 20000; // 반복 일정 펼치기 안전장치

// 1970-01-01 부터 센 "한국 날짜" 번호
const kstDayOfInstant = (ms) => Math.floor((ms + KST_OFFSET_MS) / DAY_MS);
const dayNumber = (t) => Date.UTC(t.year, t.month - 1, t.day) / DAY_MS;

// 시각이 있는 값 → 절대 시각(ms).
// 시간대 정보가 없는(floating) 값은 한국 시간으로 본다
function instantOf(t) {
  if (!t.zone || t.zone.tzid === "floating") {
    return (
      Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second) -
      KST_OFFSET_MS
    );
  }
  return t.toUnixTime() * 1000;
}

// 일정이 걸친 한국 날짜 범위 [startDay, endDay)
function spanOf(start, end) {
  if (start.isDate) {
    // 종일 일정: 시각 변환 없이 날짜 그대로 (DTEND 는 다음 날이라 끝은 포함 안 함)
    const startDay = dayNumber(start);
    const endDay = end ? Math.max(dayNumber(end), startDay + 1) : startDay + 1;
    return { startDay, endDay };
  }
  const startMs = instantOf(start);
  const endMs = end ? instantOf(end) : startMs;
  const startDay = kstDayOfInstant(startMs);
  const lastDay = kstDayOfInstant(Math.max(endMs - 1, startMs));
  return { startDay, endDay: lastDay + 1 };
}

const isCancelled = (component) =>
  String(component.getFirstPropertyValue("status") ?? "").toUpperCase() ===
  "CANCELLED";

export function countEvents(icsText, nowMs = Date.now()) {
  const counts = { today: 0, week: 0, later: 0 };
  const today = kstDayOfInstant(nowMs);
  const lastDay = today + RANGE_DAYS;

  const add = ({ startDay, endDay }) => {
    if (startDay <= today && today < endDay) counts.today++; // 오늘 걸쳐 있는 일정
    else {
      const offset = startDay - today;
      if (offset >= 1 && offset <= WEEK_DAYS) counts.week++;
      else if (offset > WEEK_DAYS && offset <= RANGE_DAYS) counts.later++;
    }
  };

  const calendar = new ICAL.Component(ICAL.parse(icsText));
  // 일정 시각을 읽기 전에 ICS 안의 시간대 정의를 등록
  for (const tz of calendar.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(tz);
  }

  // 같은 UID 의 원본 일정과 개별 수정 회차(RECURRENCE-ID) 묶기
  const masters = [];
  const exceptionsByUid = new Map();
  for (const vevent of calendar.getAllSubcomponents("vevent")) {
    if (vevent.hasProperty("recurrence-id")) {
      const uid = vevent.getFirstPropertyValue("uid");
      if (!exceptionsByUid.has(uid)) exceptionsByUid.set(uid, []);
      exceptionsByUid.get(uid).push(vevent);
    } else {
      masters.push(vevent);
    }
  }

  for (const vevent of masters) {
    const uid = vevent.getFirstPropertyValue("uid");
    const exceptions = exceptionsByUid.get(uid) ?? [];
    exceptionsByUid.delete(uid);
    if (isCancelled(vevent)) continue;

    const event = new ICAL.Event(vevent, { exceptions });
    if (!event.isRecurring()) {
      add(spanOf(event.startDate, event.endDate));
      continue;
    }

    // 반복 일정: RRULE·RDATE 를 실제 날짜로 펼치고, EXDATE 는 빠지고,
    // 수정된 회차는 수정된 시각·상태로 반영됨
    const iterator = event.iterator();
    let next;
    let guard = 0;
    while ((next = iterator.next()) && guard++ < MAX_OCCURRENCES) {
      if (spanOf(next, null).startDay > lastDay + 1) break;
      const details = event.getOccurrenceDetails(next);
      if (isCancelled(details.item.component)) continue;
      add(spanOf(details.startDate, details.endDate));
    }
  }

  // 원본 없이 수정 회차만 있는 경우는 한 번짜리 일정으로 처리
  for (const orphans of exceptionsByUid.values()) {
    for (const vevent of orphans) {
      if (isCancelled(vevent)) continue;
      const event = new ICAL.Event(vevent);
      add(spanOf(event.startDate, event.endDate));
    }
  }

  return counts;
}
