import "server-only";
import { cache } from "react";
import { countEvents } from "@/lib/calendar-count";

const REVALIDATE = 600; // 10분

export const CALENDAR_STATUS = {
  connected: "연결됨",
  unset: "미설정",
  error: "오류",
};

const EMPTY = { today: 0, week: 0, later: 0 };

// 일정 개수와 연결 상태만 반환 (제목·장소·설명·참석자는 여기서 밖으로 나가지 않음).
// ICS 주소는 캘린더 전체를 볼 수 있는 비밀 주소라 로그·에러 메시지에 절대 쓰지 않음.
// cache: 한 번의 요청 안에서 레이아웃과 페이지가 같이 불러도 한 번만 계산
export const getCalendarSummary = cache(async () => {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (!url) return { status: CALENDAR_STATUS.unset, counts: EMPTY };

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE } });
    if (!res.ok) throw new Error("캘린더 요청 실패");
    const counts = countEvents(await res.text(), Date.now());
    return { status: CALENDAR_STATUS.connected, counts };
  } catch {
    // 에러 객체에 주소가 섞일 수 있어 내용은 버리고 상태만 반환
    return { status: CALENDAR_STATUS.error, counts: EMPTY };
  }
});
