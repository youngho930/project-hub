import "server-only";
import { CALENDAR_STATUS, getCalendarSummary } from "@/lib/calendar";
import { PIPELINE_STATUS, getPipelineDetail } from "@/lib/pipeline";

// 노션 대시보드 "오늘 한눈에" 위젯(public/widgets/briefing.html)이 읽는 숫자 → app/api/briefing/route.js
// 누구나 열 수 있는 주소라 개수와 상태만 담는다:
// 일정 제목·회사명·공고명, 지원·서류·면접·결과 개수는 여기에 없다.
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 한국은 서머타임이 없어 +9 고정
const kstDay = (ms) => Math.floor((ms + KST_OFFSET_MS) / DAY_MS);

export function buildBriefing(calendar, pipeline, nowMs = Date.now()) {
  const calendarUp = calendar.status === CALENDAR_STATUS.connected;
  // "대기"(PC 가 꺼져 2일 넘게 갱신 없음)도 마지막 값은 있으므로 보여 준다
  const jobsUp =
    pipeline.status === PIPELINE_STATUS.connected ||
    pipeline.status === PIPELINE_STATUS.stale;
  const updatedMs = jobsUp && pipeline.updatedAt ? Date.parse(pipeline.updatedAt) : NaN;
  // 새 공고는 "오늘" 숫자: 오늘 아직 수집 전이면(어제 값만 있으면) 0
  const collectedToday = !Number.isNaN(updatedMs) && kstDay(updatedMs) === kstDay(nowMs);

  return {
    calendar: {
      status: calendar.status,
      today: calendarUp ? calendar.counts.today : null,
      week: calendarUp ? calendar.counts.week : null,
    },
    jobs: {
      status: pipeline.status,
      saved: jobsUp ? pipeline.saved : null,
      newToday: !jobsUp ? null : collectedToday ? pipeline.newToday : 0,
      dueSoon: jobsUp ? pipeline.dueSoon : null,
      collectedToday,
      updatedAt: jobsUp ? pipeline.updatedAt : null,
    },
  };
}

export async function getBriefing() {
  const [calendar, pipeline] = await Promise.all([
    getCalendarSummary(),
    getPipelineDetail(),
  ]);
  return buildBriefing(calendar, pipeline);
}
