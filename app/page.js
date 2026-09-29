import { getAllProjects } from "@/lib/projects";

const CARDS = ["오늘 일정", "지원 현황", "배포 상태", "놓친 일"];

export default function Home() {
  const count = getAllProjects().length;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">전체 현황</h1>
      <p className="mt-2 text-sm text-muted">
        관리 중인 프로젝트{" "}
        <span className="font-semibold text-accent">{count}개</span>
      </p>

      <div className="mt-8 grid grid-cols-2 gap-6">
        {CARDS.map((title) => (
          <section
            key={title}
            className="min-h-44 rounded-xl border border-line bg-card p-6"
          >
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-4 text-sm text-muted">준비 중</p>
          </section>
        ))}
      </div>
    </div>
  );
}
