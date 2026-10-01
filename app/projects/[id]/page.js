import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Lock, Network } from "lucide-react";
import PreviewFrame from "@/components/PreviewFrame";
import WorkflowGallery from "@/components/WorkflowGallery";
import RelativeTime from "@/components/RelativeTime";
import StatusBadge from "@/components/StatusBadge";
import { CheckBadge, Value } from "@/components/Value";
import { GITHUB_STATUS, getRepoActivities, reposOf } from "@/lib/github";
import { getGallery, getPreview } from "@/lib/previews";
import { NEEDS_CHECK, getAllProjects, getProject } from "@/lib/projects";
import { pageMetadata } from "@/lib/site";

const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

export function generateStaticParams() {
  return getAllProjects().map((project) => ({ id: project.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return { title: "프로젝트" };
  // 링크 미리보기: 프로젝트 이름과 요약 (이미지는 같은 폴더의 opengraph-image)
  return pageMetadata({
    title: project.name,
    description: project.summary,
    path: `/projects/${project.id}`,
  });
}

// 라벨: 작은 대문자 영문 + 옆에 회색 한글
function SectionLabel({ en, ko }) {
  return (
    <h2 className="flex items-baseline gap-2">
      <span className="label">{en}</span>
      <span className="text-caption text-muted/70">{ko}</span>
    </h2>
  );
}

function Section({ en, ko, children }) {
  return (
    <section className="card">
      <SectionLabel en={en} ko={ko} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Tags({ items }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          {item === NEEDS_CHECK ? (
            <CheckBadge />
          ) : (
            <span className="inline-block rounded-full border border-line bg-inset px-3 py-1 text-caption">
              {item}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ExternalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 break-all text-accent hover:underline"
    >
      {children}
      <ArrowUpRight size={14} className="shrink-0" />
    </a>
  );
}

// 비공개 저장소는 방문자가 눌러도 404라서 링크 대신 자물쇠 표시
function RepoLink({ repo, isPrivate = false }) {
  if (isPrivate) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted">
        <Lock size={13} className="shrink-0" />
        비공개 저장소
      </span>
    );
  }
  return (
    <Value value={repo}>
      <ExternalLink href={`https://github.com/${repo}`}>{repo}</ExternalLink>
    </Value>
  );
}

function PrivateBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-inset px-1.5 py-0.5 text-label text-muted">
      <Lock size={10} />
      비공개
    </span>
  );
}

// 한 저장소의 마지막 활동 (실패하면 "불러오기 실패")
function LastActivity({ activity }) {
  if (!activity?.ok) {
    return <span className="text-red">불러오기 실패</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>
        마지막 활동 <RelativeTime iso={activity.pushedAt} />
      </span>
      {activity.private && <PrivateBadge />}
    </span>
  );
}

function CommitList({ commits }) {
  if (isEmpty(commits)) {
    return <p className="text-body text-muted">커밋 없음</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {commits.map((commit) => (
        <li key={commit.sha}>
          {/* 줄 전체가 커밋 링크 (누르는 영역 높이 44px 이상) */}
          <a
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group -mx-2 flex min-h-11 items-center gap-4 rounded-md px-2 py-2 text-body transition-colors hover:bg-line/30"
          >
            <span className="min-w-0 flex-1 truncate">{commit.message}</span>
            <span className="shrink-0 text-caption text-muted">
              <RelativeTime iso={commit.date} />
            </span>
            <span className="shrink-0 font-mono text-caption text-accent group-hover:underline">
              {commit.sha}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// 최근 활동: parts가 있으면 부분별 한 줄씩, 없으면 저장소 하나 + 최근 커밋
function Activity({ project, github }) {
  if (github.status !== GITHUB_STATUS.connected) {
    return <p className="text-body text-muted">GitHub 연결 안 됨</p>;
  }

  if (!isEmpty(project.parts)) {
    const parts = project.parts.filter(
      (part) => !isEmpty(part.repo) && part.repo !== NEEDS_CHECK
    );
    return (
      <dl>
        {parts.map((part) => (
          <Row key={part.name} label={part.name}>
            <LastActivity activity={github.repos[part.repo]} />
          </Row>
        ))}
      </dl>
    );
  }

  const activity = github.repos[project.repo];
  return (
    <div className="space-y-4">
      <div className="text-body">
        <LastActivity activity={activity} />
      </div>
      {activity?.ok && !activity.private && (
        <div className="inset p-4">
          <CommitList commits={activity.commits} />
        </div>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline gap-4 py-1.5 text-body">
      <dt className="label w-24 shrink-0">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export default async function ProjectPage({ params }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const { deploy = {} } = project;
  const hasDeploy = !isEmpty(deploy.platform) || !isEmpty(deploy.url);
  const hasLinks = !isEmpty(project.repo) || hasDeploy;

  // 서버에서 이미 비공개 저장소의 커밋 정보는 걸러진 상태
  const github = await getRepoActivities();
  const isPrivate = (repo) => github.repos[repo]?.private === true;
  const hasRepos = reposOf(project).length > 0;
  // public/previews/manifest.json 에 이미지 파일이 적혀 있을 때만
  const preview = getPreview(project.id);
  // 절차 시연 캡처 (manifest 의 gallery 가 있는 프로젝트만)
  const gallery = getGallery(project.id);
  const deployUrl = /^https?:\/\//.test(deploy.url ?? "") ? deploy.url : null;

  const allProjects = getAllProjects();
  const related = (project.related ?? [])
    .map((relatedId) => allProjects.find((p) => p.id === relatedId))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="label">
            Project <span className="mx-1 text-line">/</span>
            <span className="tracking-normal text-accent">{project.group}</span>
          </p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-page font-bold tracking-tight">
            {project.name}
            <StatusBadge status={project.status} className="text-caption" />
          </h1>
          {!isEmpty(project.summary) && (
            <p className="mt-2 text-muted">
              <Value value={project.summary} />
            </p>
          )}
        </div>
        <Link
          href={`/graph?focus=${encodeURIComponent(project.id)}`}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-body transition-colors hover:border-accent hover:text-accent"
        >
          <Network size={15} />
          그래프 보기
        </Link>
      </header>

      {/* 섹션 사이 32px: 미리보기 / 효과 / 상세 카드 묶음. 카드 사이는 16px */}
      <div className="mt-section space-y-section">
        {preview && (
          <section>
            <SectionLabel en="Preview" ko="미리보기" />
            <div className="mt-3">
              <PreviewFrame
                src={preview.src}
                width={preview.width}
                height={preview.height}
                url={deployUrl}
                label={project.name}
                sizes="(min-width: 1640px) 1400px, calc(100vw - 320px)"
                eager
              />
              {preview.capturedAt && (
                <p className="mt-2 text-caption text-muted">{preview.capturedAt} 캡처</p>
              )}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section>
            <SectionLabel en="Workflow" ko="절차" />
            <div className="mt-3">
              <WorkflowGallery steps={gallery} label={project.name} />
            </div>
          </section>
        )}

        {!isEmpty(project.results) && (
          <section>
            <SectionLabel en="Results" ko="효과" />
            {/* 한 줄 3칸 고정: 카드가 1~2개여도 한 칸 폭만 차지 */}
            <ul className="mt-3 grid grid-cols-1 gap-card md:grid-cols-2 lg:grid-cols-3">
              {project.results.map((result, i) => (
                <li key={i} className="card">
                  <p className="text-caption text-muted">
                    <Value value={result.label} />
                  </p>
                  <p className="mt-2 text-heading font-bold leading-snug text-accent">
                    <Value value={result.after} />
                  </p>
                  {!isEmpty(result.before) && (
                    <p className="mt-2 text-caption text-muted">
                      이전: <Value value={result.before} />
                    </p>
                  )}
                  {!isEmpty(result.note) && (
                    <p className="mt-1.5 text-caption text-muted">
                      <Value value={result.note} />
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="space-y-card">
          {hasLinks && (
            <Section en="Links" ko="링크">
              <dl>
                {!isEmpty(project.repo) && (
                  <Row label="Repo">
                    <RepoLink repo={project.repo} isPrivate={isPrivate(project.repo)} />
                  </Row>
                )}
                {hasDeploy && (
                  <Row label="Deploy">
                    <span className="flex flex-wrap items-center gap-2">
                      {!isEmpty(deploy.platform) && (
                        <Value value={deploy.platform} />
                      )}
                      {!isEmpty(deploy.url) && (
                        <Value value={deploy.url}>
                          <ExternalLink href={deploy.url}>{deploy.url}</ExternalLink>
                        </Value>
                      )}
                    </span>
                  </Row>
                )}
              </dl>
            </Section>
          )}

          {hasRepos && (
            <Section en="Activity" ko="최근 활동">
              <Activity project={project} github={github} />
            </Section>
          )}

          {!isEmpty(project.tech) && (
            <Section en="Stack" ko="기술">
              <Tags items={project.tech} />
            </Section>
          )}

          {!isEmpty(project.parts) && (
            <Section en="Parts" ko="구성">
              <div className="grid gap-3 sm:grid-cols-2">
                {project.parts.map((part) => (
                  <div key={part.name} className="inset p-5">
                    <h3 className="font-semibold">{part.name}</h3>
                    {!isEmpty(part.repo) && (
                      <p className="mt-1 text-body">
                        <RepoLink repo={part.repo} isPrivate={isPrivate(part.repo)} />
                      </p>
                    )}
                    {!isEmpty(part.tech) && (
                      <div className="mt-3">
                        <Tags items={part.tech} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!isEmpty(project.problem) && (
            <Section en="Problem" ko="해결한 문제">
              <p className="leading-relaxed">
                <Value value={project.problem} />
              </p>
            </Section>
          )}

          {!isEmpty(project.decisions) && (
            <Section en="Decisions" ko="결정">
              <ol className="space-y-3">
                {project.decisions.map((decision, i) => (
                  // 검색 창에서 결정을 고르면 #decision-N 으로 이 카드까지 스크롤
                  <li
                    key={i}
                    id={`decision-${i + 1}`}
                    className="inset scroll-mt-20 p-5 transition-colors target:border-accent/60 target:bg-accent/5"
                  >
                    <dl>
                      {!isEmpty(decision.what) && (
                        <Row label="What">
                          <span className="font-semibold">
                            <Value value={decision.what} />
                          </span>
                        </Row>
                      )}
                      {!isEmpty(decision.why) && (
                        <Row label="Why">
                          <Value value={decision.why} />
                        </Row>
                      )}
                      {!isEmpty(decision.rejected) && (
                        <Row label="Rejected">
                          <Value value={decision.rejected} />
                        </Row>
                      )}
                    </dl>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {!isEmpty(related) && (
            <Section en="Related" ko="관련 프로젝트">
              <ul className="flex flex-wrap gap-2">
                {related.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="inset inline-flex min-h-11 items-center px-3 py-1.5 text-body hover:border-accent hover:text-accent"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
