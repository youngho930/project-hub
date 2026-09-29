"use client";

const UNITS = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

function relative(date) {
  const seconds = (date.getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "방금 전";
}

// "3일 전" 같은 상대 시간. 페이지는 10분 캐시되므로 지금 시각 기준으로 브라우저에서 계산
export default function RelativeTime({ iso }) {
  if (!iso) return null;
  const date = new Date(iso);
  return (
    <time
      dateTime={iso}
      title={date.toLocaleString("ko-KR")}
      suppressHydrationWarning
    >
      {relative(date)}
    </time>
  );
}
