"use client";

import { CornerDownLeft, FileText, LayoutGrid, Lightbulb, Search, Share2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { excerpt, isChosungQuery, matchText, normalizeQuery, splitByMatch } from "./match";

const PER_GROUP = 5;
const EXAMPLES = ["python", "ㅈㅂㅅ", "엑셀", "날짜"];

const GROUPS = [
  { key: "pages", label: "화면", Icon: LayoutGrid },
  { key: "projects", label: "프로젝트", Icon: FileText },
  { key: "tech", label: "기술", Icon: Share2 },
  { key: "decisions", label: "결정", Icon: Lightbulb },
];

// 종류별로 어떤 글자를 제목(강조)·보조 설명으로 쓰는지
const FIELDS = {
  pages: (item) => ({ title: item.title, sub: item.hint, extra: [item.keywords] }),
  projects: (item) => ({ title: item.title, sub: item.summary, extra: [item.group, item.status] }),
  tech: (item) => ({ title: item.title, sub: item.projects.join(" · "), extra: [] }),
  decisions: (item) => ({ title: item.title, sub: item.why, extra: [item.project] }),
};

// 한 항목 점수: 제목 앞부분 일치 0, 제목 일치 1, 설명 일치 2, 그 밖(그룹·키워드) 3.
// 초성 검색은 제목에만 적용 (설명·사용 프로젝트 목록까지 보면 "ㅈㅂㅅ" 가 자비스를 쓰는 기술까지 잡음)
function scoreItem(kind, item, query) {
  const { title, sub, extra } = FIELDS[kind](item);
  const chosung = isChosungQuery(query);
  const titleMatch = matchText(title, query);
  const subMatch = chosung ? null : matchText(sub, query);
  const extraMatch = !chosung && extra.some((value) => matchText(value, query));
  if (!titleMatch && !subMatch && !extraMatch) return null;
  const score = titleMatch ? (titleMatch.prefix ? 0 : 1) : subMatch ? 2 : 3;
  return { kind, item, score, title, titleMatch, sub, subMatch };
}

function runSearch(index, rawQuery) {
  const query = normalizeQuery(rawQuery);
  if (!query) {
    const featured = index.featured
      .map((id) => index.projects.find((p) => p.id === id))
      .filter(Boolean);
    return [
      { key: "featured", label: "대표 프로젝트", Icon: FileText, results: featured.map((item) => ({ kind: "projects", item, ...FIELDS.projects(item) })) },
      { key: "pages", label: "화면", Icon: LayoutGrid, results: index.pages.map((item) => ({ kind: "pages", item, ...FIELDS.pages(item) })) },
    ];
  }
  return GROUPS.map((group) => ({
    ...group,
    results: index[group.key]
      .map((item, order) => ({ order, hit: scoreItem(group.key, item, query) }))
      .filter(({ hit }) => hit)
      .sort((a, b) => a.hit.score - b.hit.score || a.order - b.order)
      .slice(0, PER_GROUP)
      .map(({ hit }) => hit),
  })).filter((group) => group.results.length > 0);
}

function Highlight({ text, match }) {
  const [before, hit, after] = splitByMatch(text, match);
  return (
    <>
      {before}
      {hit && <mark className="rounded-sm bg-accent/25 px-px text-accent">{hit}</mark>}
      {after}
    </>
  );
}

function ResultRow({ result, active, id, onPick, onHover }) {
  const { kind, item } = result;
  const sub = result.sub ? excerpt(result.sub, result.subMatch) : null;
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseMove={onHover}
      onClick={onPick}
      className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ${
        active ? "bg-line/80 ring-1 ring-accent/40" : "hover:bg-line/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-body font-semibold">
            <Highlight text={result.title} match={result.titleMatch} />
          </span>
          {kind === "projects" && <StatusBadge status={item.status} />}
          {kind === "projects" && item.group && (
            <span className="shrink-0 text-label text-muted">{item.group}</span>
          )}
          {kind === "decisions" && (
            <span className="shrink-0 text-label text-muted">{item.project}</span>
          )}
        </div>
        {sub && (
          <p className="mt-0.5 line-clamp-1 text-caption text-muted">
            {kind === "tech" && <span className="text-muted/80">사용 · </span>}
            <Highlight text={sub.text} match={sub.match} />
          </p>
        )}
      </div>
      {active && <CornerDownLeft size={14} className="mt-1 shrink-0 text-muted" aria-hidden="true" />}
    </li>
  );
}

// Ctrl K / ⌘ K 검색 창. index: lib/search.js 가 만든 검색용 데이터
export default function CommandPalette({ open, onClose, index }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // 창을 열 때마다 비우고 첫 줄 선택
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }

  const groups = useMemo(() => runSearch(index, query), [index, query]);
  const flat = useMemo(() => groups.flatMap((group) => group.results), [groups]);
  // 각 묶음의 첫 결과가 전체 목록에서 몇 번째인지 (화살표 이동용 번호)
  const offsets = useMemo(
    () => groups.map((_, gi) => groups.slice(0, gi).reduce((sum, g) => sum + g.results.length, 0)),
    [groups]
  );
  const activeIndex = Math.min(active, Math.max(0, flat.length - 1));

  // 열면 입력칸에 포커스, 닫으면 원래 있던 곳으로. 뒤 화면 스크롤 막기
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  // 선택한 줄이 보이도록 스크롤
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listId]);

  if (!open) return null;

  const pick = (result) => {
    if (!result) return;
    onClose();
    router.push(result.item.href);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(flat[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      // 창 안의 포커스 가능한 요소끼리만 돌기
      const focusable = [...dialogRef.current.querySelectorAll("input, button")];
      const at = focusable.indexOf(document.activeElement);
      const next = (at + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      event.preventDefault();
      focusable[next]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="검색"
        className="absolute inset-x-2 top-2 flex h-[calc(100svh-1rem)] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(245,158,11,0.06)] sm:inset-x-auto sm:top-[12vh] sm:left-1/2 sm:h-auto sm:max-h-[70vh] sm:w-[640px] sm:-translate-x-1/2"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-4">
          <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={flat.length ? `${listId}-${activeIndex}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="프로젝트, 기술, 결정 검색 (초성도 돼요)"
            autoComplete="off"
            spellCheck={false}
            className="h-14 min-w-0 flex-1 bg-transparent text-input outline-none placeholder:text-muted/70"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="검색 창 닫기"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-line/50 hover:text-text focus-visible:outline-2 focus-visible:outline-accent sm:size-auto sm:px-2 sm:py-1"
          >
            <X size={18} className="sm:hidden" />
            <kbd className="hidden rounded border border-line bg-inset px-1.5 py-0.5 font-sans text-label sm:inline">Esc</kbd>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {flat.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-semibold">찾는 결과가 없어요</p>
              <p className="mt-2 text-body text-muted">이런 검색어는 어떠세요?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      setActive(0);
                      inputRef.current?.focus();
                    }}
                    className="min-h-11 rounded-lg border border-line bg-inset px-3 text-body text-muted hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent sm:min-h-0 sm:py-1.5"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul id={listId} role="listbox" aria-label="검색 결과">
              {groups.map((group, gi) => (
                <li key={group.key} role="presentation" className="mb-1 last:mb-0">
                  <p className="label flex items-center gap-1.5 px-3 pt-2 pb-1.5" role="presentation">
                    <group.Icon size={12} aria-hidden="true" />
                    {group.label}
                  </p>
                  <ul role="presentation">
                    {group.results.map((result, ri) => {
                      const i = offsets[gi] + ri;
                      return (
                        <ResultRow
                          key={result.item.id}
                          id={`${listId}-${i}`}
                          result={result}
                          active={i === activeIndex}
                          onHover={() => i !== activeIndex && setActive(i)}
                          onPick={() => pick(result)}
                        />
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-4 border-t border-line px-4 py-2.5 text-label text-muted sm:flex">
          <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> 이동</span>
          <span><kbd className="font-sans">Enter</kbd> 열기</span>
          <span><kbd className="font-sans">Esc</kbd> 닫기</span>
          <span className="ml-auto">초성 검색: ㅈㅂㅅ → 자비스</span>
        </div>
      </div>
    </div>
  );
}
