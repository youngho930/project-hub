import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { CHECKLIST_SIZE, getCompletion, getMissed } from "@/lib/projects";
import { pageMetadata } from "@/lib/site";
import IntroSettingSection from "@/components/IntroSettingSection";
import { getIntroMode } from "@/lib/intro-setting";

export const metadata = pageMetadata({
  title: "관리",
  description: "포트폴리오 프로젝트별 체크리스트(저장소, 문제, 결정 이유, 효과, 기술)가 얼마나 채워졌는지 보여주는 관리 화면.",
  path: "/status",
});

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
        fontSize="30"
        fontWeight="700"
      >
        {percent}
        <tspan fontSize="14" fill="var(--color-muted)" dx="2">
          %
        </tspan>
      </text>
    </svg>
  );
}

// 포트폴리오 관리용: 완성도와 채워야 할 항목 (첫 화면에서 옮겨 옴)
export default async function StatusPage() {
  const completion = getCompletion();
  const missed = getMissed();
  const introMode = await getIntroMode(); // 현재 값 표시용 (읽기 실패면 warp)

  return (
    <div className="mx-auto max-w-[1400px]">
      <header>
        <p className="label">Status</p>
        <h1 className="mt-1 text-page font-bold tracking-tight">관리</h1>
        <p className="mt-2 text-body text-muted">포트폴리오 내용이 얼마나 채워졌는지 확인합니다.</p>
      </header>

      <div className="mt-section grid grid-cols-1 gap-card lg:grid-cols-2">
        <section className="card">
          <h2 className="label">Completion</h2>
          <p className="mt-1 text-caption text-muted">
            포트폴리오 완성도 (프로젝트당 최대 {CHECKLIST_SIZE}개 항목, 진행 상태별 제외)
          </p>
          <div className="mt-5 flex items-center gap-8">
            <Donut percent={completion.percent} />
            <dl className="space-y-3">
              <div>
                <dt className="label">Done</dt>
                <dd className="text-heading font-bold">{completion.done}</dd>
              </div>
              <div>
                <dt className="label">Left</dt>
                <dd className={`text-heading font-bold ${completion.left > 0 ? "text-red" : "text-green"}`}>
                  {completion.left}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 빈 경우는 경고(빨강) 대신 완료(초록) 모양으로 */}
        <section className={`card ${missed.length === 0 ? "border-green/30" : "border-red/40"}`}>
          <h2 className="flex items-center gap-2">
            <span className="label">Missed</span>
            {missed.length === 0 ? (
              <CheckCircle2 size={15} className="text-green" />
            ) : (
              <AlertTriangle size={15} className="text-red" />
            )}
            <span className={`text-title font-bold ${missed.length === 0 ? "text-green" : "text-red"}`}>
              {completion.left}
            </span>
          </h2>
          <p className="mt-1 text-caption text-muted">포트폴리오에 채워야 할 항목</p>
          {missed.length === 0 ? (
            <div className="inset mt-5 flex items-center gap-3 px-4 py-4">
              <CheckCircle2 size={20} className="shrink-0 text-green" />
              <div>
                <p className="text-body font-semibold">채워야 할 항목이 없어요</p>
                <p className="mt-0.5 text-caption text-muted">
                  모든 프로젝트가 진행 상태에 맞는 체크리스트를 채웠습니다.
                </p>
              </div>
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {missed.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/projects/${item.id}`}
                    className="inset flex items-center gap-3 border-l-2 border-l-red/70 px-4 py-2.5 text-body transition-colors hover:border-line hover:border-l-red hover:bg-line/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{item.name}</span>
                      <span className="mt-0.5 block text-caption text-muted">
                        {item.missing.join(", ")}
                      </span>
                    </span>
                    <span className="ml-auto shrink-0 rounded-md border border-red/40 bg-red/10 px-2 py-0.5 text-caption font-semibold text-red">
                      {item.missing.length}개 부족
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 첫 방문 인트로: 종류를 골라 관리 비밀번호와 함께 저장 (components/IntroSettingSection.js) */}
      <IntroSettingSection current={introMode} />
    </div>
  );
}
