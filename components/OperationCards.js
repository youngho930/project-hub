import { CalendarDays, Clock, Database, Hourglass, RefreshCw, Sun } from "lucide-react";
import { CALENDAR_STATUS } from "@/lib/calendar";
import { PIPELINE_STATUS, formatKst } from "@/lib/pipeline";

// 구글 캘린더 일정 개수 (오늘 / 내일부터 7일 / 8일부터 30일)
const BOARD = [
  { key: "today", label: "오늘", Icon: Sun, color: "bg-orange" },
  { key: "week", label: "이번 주", Icon: CalendarDays, color: "bg-green" },
  { key: "later", label: "나중에", Icon: Hourglass, color: "bg-blue" },
];

const BOARD_CAPTION = {
  [CALENDAR_STATUS.connected]: "구글 캘린더 · 10분마다 갱신",
  [CALENDAR_STATUS.unset]: "캘린더 연결 전",
  [CALENDAR_STATUS.error]: "캘린더 불러오기 실패",
};

// 막대 길이: 항목 중 가장 큰 값 기준 비율
function BarList({ items }) {
  const max = Math.max(...items.map((item) => item.count));
  return (
    <ul className="space-y-2.5">
      {items.map(({ label, Icon, color, count }) => (
        <li key={label} className="flex items-center gap-3 text-body">
          <Icon size={14} className="shrink-0 text-muted" />
          <span className="w-12 shrink-0 text-muted">{label}</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <span
              className={`block h-full rounded-full ${color}`}
              style={{ width: `${max ? (count / max) * 100 : 0}%` }}
            />
          </span>
          <span className="w-6 text-right font-bold tabular-nums">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function OperationCard({ label, total, caption, error, children }) {
  return (
    <section className="card flex flex-col !p-5">
      <div className="flex items-center justify-between">
        <h3 className="label">{label}</h3>
        {total}
      </div>
      <div className="mt-4 flex-1">{children}</div>
      <p className={`mt-4 text-caption ${error ? "text-red" : "text-muted"}`}>{caption}</p>
    </section>
  );
}

// calendar: getCalendarSummary() 결과 (개수와 상태만)
export function BoardCard({ calendar }) {
  const items = BOARD.map((item) => ({ ...item, count: calendar.counts[item.key] }));
  const sum = items.reduce((total, item) => total + item.count, 0);
  return (
    <OperationCard
      label="Calendar"
      total={<span className="text-title font-bold tabular-nums">{sum}</span>}
      caption={BOARD_CAPTION[calendar.status]}
      error={calendar.status === CALENDAR_STATUS.error}
    >
      <BarList items={items} />
    </OperationCard>
  );
}

// 한 줄씩 "이름 … 값" (막대 없이). Calendar 카드와 같은 줄 간격
function FactList({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map(({ label, Icon, value }) => (
        <li key={label} className="flex items-center gap-3 text-body">
          <Icon size={14} className="shrink-0 text-muted" />
          <span className="text-muted">{label}</span>
          <span className="ml-auto font-semibold tabular-nums">{value}</span>
        </li>
      ))}
    </ul>
  );
}

// pipeline: getPipeline() 결과 (저장한 공고 수와 갱신 시각만. 지원·서류·면접·결과 개수는 서버에서 이미 버림).
// Calendar 카드와 같은 구조: 오른쪽 위 요약 숫자 하나(저장 공고) · 본문 줄(수집 방식) · 아래 출처 한 줄. 같은 정보는 한 번만
export function PipelineCard({ pipeline }) {
  const connected =
    pipeline.status === PIPELINE_STATUS.connected ||
    pipeline.status === PIPELINE_STATUS.stale;
  // 2일 넘게 갱신이 없으면(대기) 오래된 날짜 대신 상황 설명: Job Jarvis 는 PC 작업 스케줄러로 돌아 PC 를 켤 때 수집함
  const lastRun =
    pipeline.status === PIPELINE_STATUS.stale
      ? { label: "다음 수집", Icon: RefreshCw, value: "PC 실행 시 자동 수집" }
      : { label: "마지막 수집", Icon: RefreshCw, value: (connected && formatKst(pipeline.updatedAt)) || "-" };
  return (
    <OperationCard
      label="Job collector"
      total={
        connected && (
          <span className="flex items-baseline gap-1">
            {/* 0건이면 "0" 대신 "—" (수집이 막 시작됐거나 비어 있을 때 멈춘 것처럼 보이지 않게) */}
            <span className="text-title font-bold tabular-nums">{pipeline.saved > 0 ? pipeline.saved : "—"}</span>
            {pipeline.saved > 0 && <span className="text-caption text-muted">건 저장</span>}
          </span>
        )
      }
      error={pipeline.status === PIPELINE_STATUS.error}
      caption={
        connected
          ? "Job Jarvis 연동"
          : pipeline.status === PIPELINE_STATUS.unset
            ? "공고 수집 연결 전"
            : "공고 수집 현황 불러오기 실패"
      }
    >
      <FactList
        items={[
          { label: "수집 출처", Icon: Database, value: "고용24 API" },
          { label: "수집 주기", Icon: Clock, value: "매일 9시" },
          lastRun,
        ]}
      />
    </OperationCard>
  );
}
