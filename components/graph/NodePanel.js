import Link from "next/link";
import PreviewFrame from "@/components/PreviewFrame";
import { ILLUSTRATIONS } from "@/components/illustrations";
import { ArrowUpRight, Lock } from "lucide-react";
import { Value } from "@/components/Value";
import { TYPE_META, TYPE_ORDER } from "./types";

const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

function Dot({ type }) {
  const { color } = TYPE_META[type];
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// 다른 노드로 이동하는 줄 (프로젝트 목록 등)
function NodeButton({ id, name, type = "project", onGo }) {
  return (
    <button
      type="button"
      onClick={() => onGo(id)}
      className="inset flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:border-accent hover:text-accent"
    >
      <Dot type={type} />
      <span className="truncate">{name}</span>
    </button>
  );
}

function ProjectOf({ node, onGo }) {
  return (
    <Field label="Project">
      <NodeButton
        id={`project:${node.projectId}`}
        name={node.projectName}
        onGo={onGo}
      />
    </Field>
  );
}

function Empty({ counts }) {
  return (
    <div>
      <p className="text-sm text-muted">노드를 눌러 자세히 보기</p>
      <ul className="mt-6 space-y-3">
        {TYPE_ORDER.map((type) => (
          <li key={type} className="flex items-center gap-2.5 text-sm">
            <Dot type={type} />
            <span>{TYPE_META[type].label}</span>
            <span className="ml-auto font-bold">{counts[type] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 캡처 이미지가 없는 프로젝트: 직접 그린 일러스트 (16:10)
function ProjectIllustration({ id }) {
  const Illustration = ILLUSTRATIONS[id];
  return (
    <div className="aspect-[16/10] overflow-hidden rounded-xl border border-line bg-inset">
      <Illustration />
    </div>
  );
}

function Body({ node, onGo }) {
  switch (node.type) {
    case "project":
      return (
        <>
          {!isEmpty(node.summary) && (
            <Field label="Summary">
              <Value value={node.summary} />
            </Field>
          )}
          {node.preview && (
            <PreviewFrame
              src={node.preview.src}
              width={node.preview.width}
              height={node.preview.height}
              label={node.name}
              sizes="272px"
              compact
            />
          )}
          {!node.preview && ILLUSTRATIONS[node.projectId] && (
            <ProjectIllustration id={node.projectId} />
          )}
          <Link
            href={`/projects/${node.projectId}`}
            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            프로젝트 화면 열기
            <ArrowUpRight size={14} />
          </Link>
          {!isEmpty(node.related) && (
            <Field label="Related">
              <div className="space-y-1.5">
                {node.related.map((p) => (
                  <NodeButton
                    key={p.id}
                    id={`project:${p.id}`}
                    name={p.name}
                    onGo={onGo}
                  />
                ))}
              </div>
            </Field>
          )}
        </>
      );
    case "tech":
      return (
        <Field label={`Used by · ${node.projects.length}`}>
          <div className="space-y-1.5">
            {node.projects.map((p) => (
              <NodeButton
                key={p.id}
                id={`project:${p.id}`}
                name={p.name}
                onGo={onGo}
              />
            ))}
          </div>
        </Field>
      );
    case "decision":
      return (
        <>
          <Field label="What">
            <Value value={node.what} />
          </Field>
          {!isEmpty(node.why) && (
            <Field label="Why">
              <Value value={node.why} />
            </Field>
          )}
          {!isEmpty(node.rejected) && (
            <Field label="Rejected">
              <Value value={node.rejected} />
            </Field>
          )}
          <ProjectOf node={node} onGo={onGo} />
        </>
      );
    case "result":
      return (
        <>
          <div>
            <p className="text-xs text-muted">
              <Value value={node.label} />
            </p>
            <p className="mt-1 text-2xl font-bold text-orange">
              <Value value={node.after} />
            </p>
            {!isEmpty(node.before) && (
              <p className="mt-2 text-xs text-muted">
                이전: <Value value={node.before} />
              </p>
            )}
            {!isEmpty(node.note) && (
              <p className="mt-1.5 text-xs text-muted">
                <Value value={node.note} />
              </p>
            )}
          </div>
          <ProjectOf node={node} onGo={onGo} />
        </>
      );
    case "part":
      return (
        <>
          {node.repoPrivate && (
            <Field label="Repo">
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Lock size={13} className="shrink-0" />
                비공개 저장소
              </span>
            </Field>
          )}
          {!isEmpty(node.repo) && (
            <Field label="Repo">
              <Value value={node.repo}>
                <a
                  href={`https://github.com/${node.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 break-all text-accent hover:underline"
                >
                  {node.repo}
                  <ArrowUpRight size={14} className="shrink-0" />
                </a>
              </Value>
            </Field>
          )}
          {!isEmpty(node.tech) && (
            <Field label="Stack">
              <ul className="flex flex-wrap gap-1.5">
                {node.tech.map((tech) => (
                  <li key={tech}>
                    <Value value={tech}>
                      <span className="inline-block rounded-full border border-line bg-inset px-2.5 py-0.5 text-xs">
                        {tech}
                      </span>
                    </Value>
                  </li>
                ))}
              </ul>
            </Field>
          )}
          <ProjectOf node={node} onGo={onGo} />
        </>
      );
    default:
      return null;
  }
}

export default function NodePanel({ node, counts, onGo }) {
  return (
    <aside className="card w-80 shrink-0 overflow-y-auto">
      {node ? (
        <div className="space-y-5">
          <div>
            <p className="flex items-center gap-2">
              <Dot type={node.type} />
              <span className="label">{TYPE_META[node.type].label}</span>
            </p>
            <h2 className="mt-2 text-lg font-bold leading-snug">
              {node.type === "result" ? node.label : node.name}
            </h2>
            {node.type === "project" && (
              <p className="mt-1 text-xs text-muted">{node.group}</p>
            )}
          </div>
          <div className="space-y-5">
            <Body node={node} onGo={onGo} />
          </div>
        </div>
      ) : (
        <>
          <h2 className="label mb-3">Info</h2>
          <Empty counts={counts} />
        </>
      )}
    </aside>
  );
}
