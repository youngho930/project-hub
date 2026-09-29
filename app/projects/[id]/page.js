import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Network } from "lucide-react";
import { CheckBadge, Value } from "@/components/Value";
import { NEEDS_CHECK, getAllProjects, getProject } from "@/lib/projects";

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

// 라벨: 작은 대문자 영문 + 옆에 회색 한글
function SectionLabel({ en, ko }) {
  return (
    <h2 className="flex items-baseline gap-2">
      <span className="label">{en}</span>
      <span className="text-xs text-muted/70">{ko}</span>
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
            <span className="inline-block rounded-full border border-line bg-inset px-3 py-1 text-xs">
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

function RepoLink({ repo }) {
  return (
    <Value value={repo}>
      <ExternalLink href={`https://github.com/${repo}`}>{repo}</ExternalLink>
    </Value>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline gap-4 py-1.5 text-sm">
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
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {project.name}
          </h1>
          {!isEmpty(project.summary) && (
            <p className="mt-2 text-muted">
              <Value value={project.summary} />
            </p>
          )}
        </div>
        <Link
          href={`/graph?focus=${encodeURIComponent(project.id)}`}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent"
        >
          <Network size={15} />
          그래프 보기
        </Link>
      </header>

      <div className="mt-8 space-y-4">
        {!isEmpty(project.results) && (
          <section>
            <SectionLabel en="Results" ko="효과" />
            <ul className="mt-3 flex flex-wrap gap-4">
              {project.results.map((result, i) => (
                <li key={i} className="card min-w-48 flex-1">
                  <p className="text-xs text-muted">
                    <Value value={result.label} />
                  </p>
                  <p className="mt-2 text-2xl font-bold leading-snug text-accent">
                    <Value value={result.after} />
                  </p>
                  {!isEmpty(result.before) && (
                    <p className="mt-2 text-xs text-muted">
                      이전: <Value value={result.before} />
                    </p>
                  )}
                  {!isEmpty(result.note) && (
                    <p className="mt-1.5 text-xs text-muted">
                      <Value value={result.note} />
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasLinks && (
          <Section en="Links" ko="링크">
            <dl>
              {!isEmpty(project.repo) && (
                <Row label="Repo">
                  <RepoLink repo={project.repo} />
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
                <li key={i} className="inset p-5">
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
                    className="inset inline-block px-3 py-1.5 text-sm hover:border-accent hover:text-accent"
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
