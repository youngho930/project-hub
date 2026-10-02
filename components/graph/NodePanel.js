"use client";

import Link from "next/link";
import { useEffect } from "react";
import PreviewFrame from "@/components/PreviewFrame";
import { ILLUSTRATIONS } from "@/components/illustrations";
import { ArrowUpRight, Lock, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
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
      <div className="mt-1 text-body leading-relaxed">{children}</div>
    </div>
  );
}

// 다른 노드로 이동하는 줄 (프로젝트 목록 등)
function NodeButton({ id, name, type = "project", onGo }) {
  return (
    <button
      type="button"
      onClick={() => onGo(id)}
      className="inset flex w-full items-center gap-2 px-3 py-2 text-left text-body transition-colors hover:border-accent hover:text-accent"
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
      <p className="text-body text-muted">노드를 눌러 자세히 보기</p>
      <ul className="mt-6 space-y-3">
        {TYPE_ORDER.map((type) => (
          <li key={type} className="flex items-center gap-2.5 text-body">
            <Dot type={type} />
            <span>{TYPE_META[type].label}</span>
            {/* 프로젝트 수는 만든 것만, 구상 중은 옆에 따로 */}
            {type === "project" && counts.idea > 0 && (
              <span className="text-caption text-muted">+ 구상 중 {counts.idea}</span>
            )}
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
          {node.status && <StatusBadge status={node.status} className="self-start" />}
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
            className="inline-flex items-center gap-1 text-body text-accent hover:underline"
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
            <p className="text-caption text-muted">
              <Value value={node.label} />
            </p>
            <p className="mt-1 text-heading font-bold text-orange">
              <Value value={node.after} />
            </p>
            {!isEmpty(node.before) && (
              <p className="mt-2 text-caption text-muted">
                이전: <Value value={node.before} />
              </p>
            )}
            {!isEmpty(node.note) && (
              <p className="mt-1.5 text-caption text-muted">
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
                      <span className="inline-block rounded-full border border-line bg-inset px-2.5 py-0.5 text-caption">
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

// 노드 제목 + 종류별 내용 (넓은 화면 패널과 좁은 화면 바텀 시트에서 같이 사용)
function NodeDetails({ node, onGo, titleId }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="flex items-center gap-2">
          <Dot type={node.type} />
          <span className="label">{TYPE_META[node.type].label}</span>
        </p>
        <h2 id={titleId} className="mt-2 text-title font-bold leading-snug">
          {node.type === "result" ? node.label : node.name}
        </h2>
        {node.type === "project" && <p className="mt-1 text-caption text-muted">{node.group}</p>}
      </div>
      <div className="space-y-5">
        <Body node={node} onGo={onGo} />
      </div>
    </div>
  );
}

// 넓은 화면(lg 이상) 오른쪽 패널
export default function NodePanel({ node, counts, onGo }) {
  return (
    <aside className="card hidden w-80 shrink-0 overflow-y-auto lg:block">
      {node ? (
        <NodeDetails node={node} onGo={onGo} />
      ) : (
        <>
          <h2 className="label mb-3">Info</h2>
          <Empty counts={counts} />
        </>
      )}
    </aside>
  );
}

// 좁은 화면: 그래프 아래 종류별 개수 한 줄
export function TypeCounts({ counts, className = "" }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted ${className}`}>
      {TYPE_ORDER.map((type) => (
        <span key={type} className="flex items-center gap-1.5 whitespace-nowrap">
          <Dot type={type} />
          {TYPE_META[type].label}
          <b className="text-text">{counts[type] ?? 0}</b>
          {type === "project" && counts.idea > 0 && <span>(+ 구상 중 {counts.idea})</span>}
        </span>
      ))}
      <span className="ml-auto">노드를 누르면 자세히</span>
    </p>
  );
}

// 좁은 화면(lg 미만): 노드를 누르면 아래에서 올라오는 창.
// 최대 높이 화면의 절반, 내용이 길면 안에서 스크롤. 닫기 버튼·바깥 누르기·Esc 로 닫힘
export function NodeSheet({ node, onGo, onClose }) {
  useEffect(() => {
    if (!node) return;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [node, onClose]);

  if (!node) return null;
  return (
    <div className="lg:hidden">
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-30 bg-black/50" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-sheet-title"
        className="sheet-up fixed inset-x-0 bottom-0 z-40 flex max-h-[50svh] flex-col rounded-t-2xl border-t border-line bg-card shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-1">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="정보 창 닫기"
          className="absolute top-3 right-3 rounded-lg p-1.5 text-muted hover:bg-line/40 hover:text-text"
        >
          <X size={18} />
        </button>
        <div className="overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <NodeDetails node={node} onGo={onGo} titleId="node-sheet-title" />
        </div>
      </section>
    </div>
  );
}
