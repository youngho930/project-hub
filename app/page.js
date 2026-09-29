import Link from "next/link";
import {
  AlertTriangle,
  Bookmark,
  CalendarDays,
  ChevronRight,
  FileText,
  Flag,
  Hourglass,
  Send,
  Sun,
  Users,
} from "lucide-react";
import { getCompletion, getMissed } from "@/lib/projects";

const RANGES = ["오늘", "7일", "30일"];

// 캘린더 연결 전이라 모두 0
const BOARD = [
  { label: "오늘", Icon: Sun, color: "bg-orange", count: 0 },
  { label: "이번 주", Icon: CalendarDays, color: "bg-green", count: 0 },
  { label: "나중에", Icon: Hourglass, color: "bg-blue", count: 0 },
];

// 지원 현황 연결 전이라 모두 0
const PIPELINE = [
  { label: "저장", Icon: Bookmark, color: "bg-blue", count: 0 },
  { label: "지원", Icon: Send, color: "bg-orange", count: 0 },
  { label: "서류", Icon: FileText, color: "bg-orange", count: 0 },
  { label: "면접", Icon: Users, color: "bg-red", count: 0 },
  { label: "결과", Icon: Flag, color: "bg-green", count: 0 },
];

function Donut({ percent }) {
  const size = 148;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (percent / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`완성도 ${percent}%`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-orange)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--color-text)"
        fontSize="34"
        fontWeight="700"
      >
        {percent}
        <tspan fontSize="16" fill="var(--color-muted)" dx="2">
          %
        </tspan>
      </text>
    </svg>
  );
}

function BarList({ items, max }) {
  return (
    <ul className="space-y-4">
      {items.map(({ label, Icon, color, count }) => (
        <li key={label} className="flex items-center gap-3 text-sm">
          <Icon size={16} className="shrink-0 text-muted" />
          <span className="w-14 shrink-0">{label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <span
              className={`block h-full rounded-full ${color}`}
              style={{ width: `${max ? (count / max) * 100 : 0}%` }}
            />
          </span>
          <span className="w-6 text-right text-base font-bold">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function sum(items) {
  return items.reduce((total, item) => total + item.count, 0);
}

export default function Home() {
  const completion = getCompletion();
  const missed = getMissed();
  const missedTotal = sum(missed);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">전체 현황</h1>
        </div>
        {/* 기간 탭은 모양만 */}
        <div className="flex rounded-lg border border-line bg-card p-1 text-sm">
          {RANGES.map((range, i) => (
            <span
              key={range}
              className={`rounded-md px-3 py-1 ${
                i === 0 ? "bg-line font-semibold" : "text-muted"
              }`}
            >
              {range}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="label">Completion</h2>
          <p className="mt-1 text-xs text-muted">포트폴리오 문서 완성도</p>
          <div className="mt-5 flex items-center gap-8">
            <Donut percent={completion.percent} />
            <dl className="space-y-3">
              <div>
                <dt className="label">Done</dt>
                <dd className="text-2xl font-bold">{completion.done}</dd>
              </div>
              <div>
                <dt className="label">Left</dt>
                <dd className="text-2xl font-bold text-red">
                  {completion.left}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="card flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="label">Board</h2>
            <span className="text-2xl font-bold">{sum(BOARD)}</span>
          </div>
          <div className="mt-6 flex-1">
            <BarList items={BOARD} max={sum(BOARD)} />
          </div>
          <p className="mt-6 text-xs text-muted">캘린더 연결 전</p>
        </section>

        <section className="card flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="label">Pipeline</h2>
            <span className="text-2xl font-bold">{sum(PIPELINE)}</span>
          </div>
          <div className="mt-6 flex-1">
            <BarList items={PIPELINE} max={sum(PIPELINE)} />
          </div>
          <p className="mt-6 text-xs text-muted">지원 현황 연결 전</p>
        </section>

        <section className="card border-red/40">
          <h2 className="flex items-center gap-2">
            <span className="label">Missed</span>
            <AlertTriangle size={15} className="text-red" />
            <span className="text-xl font-bold text-red">{missedTotal}</span>
          </h2>
          <p className="mt-1 text-xs text-muted">
            &quot;확인 필요&quot; 값이 남은 프로젝트
          </p>
          {missed.length === 0 ? (
            <p className="mt-6 text-sm text-muted">모두 채워졌습니다</p>
          ) : (
            <ul className="mt-5 space-y-2">
              {missed.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/projects/${item.id}`}
                    className="inset flex items-center gap-3 border-l-2 border-l-red/70 px-4 py-2.5 text-sm transition-colors hover:border-line hover:border-l-red hover:bg-line/40"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="ml-auto shrink-0 rounded-md border border-red/40 bg-red/10 px-2 py-0.5 text-xs font-semibold text-red">
                      확인 필요 {item.count}개
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
