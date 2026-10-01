import { Bookmark, CalendarDays, FileText, Flag, Hourglass, Send, Sun, Users } from "lucide-react";
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

// Job Jarvis 지원 단계별 개수 (Upstash hub:pipeline)
const PIPELINE = [
  { key: "saved", label: "저장", Icon: Bookmark, color: "bg-blue" },
  { key: "applied", label: "지원", Icon: Send, color: "bg-orange" },
  { key: "screening", label: "서류", Icon: FileText, color: "bg-orange" },
  { key: "interview", label: "면접", Icon: Users, color: "bg-red" },
  { key: "result", label: "결과", Icon: Flag, color: "bg-green" },
];

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
      label="Board"
      total={<span className="text-title font-bold tabular-nums">{sum}</span>}
      caption={BOARD_CAPTION[calendar.status]}
      error={calendar.status === CALENDAR_STATUS.error}
    >
      <BarList items={items} />
    </OperationCard>
  );
}

// pipeline: getPipeline() 결과 (단계별 개수와 갱신 시각만)
export function PipelineCard({ pipeline }) {
  const items = PIPELINE.map((item) => ({ ...item, count: pipeline.counts[item.key] }));
  const connected =
    pipeline.status === PIPELINE_STATUS.connected ||
    pipeline.status === PIPELINE_STATUS.stale;
  return (
    <OperationCard
      label="Pipeline"
      // 단계끼리 겹치는 숫자라 합계 대신 지원 건수
      total={
        <span className="flex items-baseline gap-1">
          <span className="text-title font-bold tabular-nums">{pipeline.counts.applied}</span>
          <span className="text-caption text-muted">지원</span>
        </span>
      }
      error={pipeline.status === PIPELINE_STATUS.error}
      caption={
        connected ? (
          <>
            Job Jarvis · 매일 9시 갱신 · 마지막 {formatKst(pipeline.updatedAt) ?? "-"}
            {pipeline.status === PIPELINE_STATUS.stale && (
              <span className="ml-1.5 font-semibold text-orange">갱신 지연</span>
            )}
          </>
        ) : pipeline.status === PIPELINE_STATUS.unset ? (
          "지원 현황 연결 전"
        ) : (
          "지원 현황 불러오기 실패"
        )
      }
    >
      <BarList items={items} />
    </OperationCard>
  );
}
