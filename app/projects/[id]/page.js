import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProjects, getProject } from "@/lib/projects";

const NEEDS_CHECK = "확인 필요";

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
  return { title: project ? `${project.name} · Project Hub` : "Project Hub" };
}

function CheckBadge() {
  return (
    <span className="inline-block rounded-md border border-yellow-400/40 bg-yellow-400/15 px-2 py-0.5 text-xs font-semibold text-yellow-300">
      {NEEDS_CHECK}
    </span>
  );
}

// "확인 필요"는 노란 배지로, 그 외엔 글자 그대로
function Value({ value, children }) {
  if (value === NEEDS_CHECK) return <CheckBadge />;
  return children ?? value;
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-line bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold text-muted">{title}</h2>
      {children}
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
            <span className="inline-block rounded-full border border-line bg-bg px-3 py-1 text-xs">
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
      className="break-all text-accent hover:underline"
    >
      {children}
    </a>
  );
}

function RepoLink({ repo }) {
  return (
    <Value value={repo}>
      <ExternalLink href={`https://github.com/${repo}`}>{repo}</ExternalLink>
    </Value>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex gap-4 py-1.5 text-sm">
      <dt className="w-20 shrink-0 text-muted">{label}</dt>
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

  const allProjects = getAllProjects();
  const related = (project.related ?? [])
    .map((relatedId) => allProjects.find((p) => p.id === relatedId))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-accent">{project.group}</p>
          <h1 className="mt-1 text-2xl font-bold">{project.name}</h1>
          {!isEmpty(project.summary) && (
            <p className="mt-2 text-muted">
              <Value value={project.summary} />
            </p>
          )}
        </div>
        <button
          type="button"
          disabled
          title="다음 단계에서 제공"
          className="shrink-0 cursor-not-allowed rounded-lg border border-line px-4 py-2 text-sm text-muted opacity-60"
        >
          그래프 보기 (다음 단계)
        </button>
      </header>

      <div className="mt-8 space-y-6">
        {hasLinks && (
          <Section title="링크">
            <dl>
              {!isEmpty(project.repo) && (
                <Row label="저장소">
                  <RepoLink repo={project.repo} />
                </Row>
              )}
              {hasDeploy && (
                <Row label="배포">
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

        {!isEmpty(project.tech) && (
          <Section title="기술">
            <Tags items={project.tech} />
          </Section>
        )}

        {!isEmpty(project.parts) && (
          <Section title="구성">
            <div className="grid gap-4 sm:grid-cols-2">
              {project.parts.map((part) => (
                <div
                  key={part.name}
                  className="rounded-xl border border-line bg-bg p-5"
                >
                  <h3 className="font-semibold">{part.name}</h3>
                  {!isEmpty(part.repo) && (
                    <p className="mt-1 text-sm">
                      <RepoLink repo={part.repo} />
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
          <Section title="해결한 문제">
            <p className="leading-relaxed">
              <Value value={project.problem} />
            </p>
          </Section>
        )}

        {!isEmpty(project.decisions) && (
          <Section title="결정">
            <ol className="space-y-4">
              {project.decisions.map((decision, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-line bg-bg p-5"
                >
                  <dl>
                    {!isEmpty(decision.what) && (
                      <Row label="무엇을">
                        <span className="font-semibold">
                          <Value value={decision.what} />
                        </span>
                      </Row>
                    )}
                    {!isEmpty(decision.why) && (
                      <Row label="왜">
                        <Value value={decision.why} />
                      </Row>
                    )}
                    {!isEmpty(decision.rejected) && (
                      <Row label="포기한 대안">
                        <Value value={decision.rejected} />
                      </Row>
                    )}
                  </dl>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {!isEmpty(project.results) && (
          <Section title="효과">
            <ul className="divide-y divide-line">
              {project.results.map((result, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <span className="w-28 shrink-0 text-muted">
                    <Value value={result.label} />
                  </span>
                  {!isEmpty(result.before) && (
                    <>
                      <span className="text-muted line-through decoration-muted/50">
                        <Value value={result.before} />
                      </span>
                      <span className="text-muted">→</span>
                    </>
                  )}
                  <span className="font-semibold text-accent">
                    <Value value={result.after} />
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!isEmpty(related) && (
          <Section title="관련 프로젝트">
            <ul className="flex flex-wrap gap-2">
              {related.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="inline-block rounded-lg border border-line bg-bg px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
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
  );
}
