"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import NodePanel from "./NodePanel";
import { TYPE_META, TYPE_ORDER } from "./types";

// 브라우저 전용 라이브러리라 서버 렌더링에서 제외
const ForceGraphCanvas = dynamic(() => import("./ForceGraphCanvas"), {
  ssr: false,
  loading: () => (
    <p className="absolute inset-0 grid place-items-center text-sm text-muted">
      그래프 불러오는 중…
    </p>
  ),
});

const FONT = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
const FOCUS_DEPTH = 2;
const LABEL_ZOOM = 2.2; // 이 배율 이상 확대하면 모든 이름 표시

// 라이브러리가 링크의 source/target을 노드 객체로 바꿔 넣기 때문에 둘 다 처리
const endId = (end) => (typeof end === "object" ? end.id : end);

function radius(node) {
  switch (node.type) {
    case "project":
      return 9;
    case "tech":
      return Math.min(8, 2.5 + Math.sqrt(node.degree) * 1.8);
    case "part":
      return 5;
    default:
      return 3.5;
  }
}

function withinDepth(startId, neighbors, depth) {
  const seen = new Set([startId]);
  let frontier = [startId];
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (const id of frontier) {
      for (const n of neighbors.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

export default function GraphView({ graph, focus }) {
  const router = useRouter();
  const fgRef = useRef();
  const boxRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hidden, setHidden] = useState(() => new Set());
  const [hoverId, setHoverId] = useState(null);
  const [engineDone, setEngineDone] = useState(false);
  const [fontTick, setFontTick] = useState(0);

  const focusNodeId = focus ? `project:${focus}` : null;
  const [selectedId, setSelectedId] = useState(focusNodeId);

  // 포커스가 바뀌면 패널도 그 프로젝트로 (전체 보기면 비움)
  const [prevFocus, setPrevFocus] = useState(focus);
  if (prevFocus !== focus) {
    setPrevFocus(focus);
    setSelectedId(focusNodeId);
  }

  // 라이브러리가 객체를 수정하므로 복사본을 넘김
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((node) => ({ ...node })),
      links: graph.links.map((link) => ({ ...link })),
    }),
    [graph]
  );

  const nodeById = useMemo(
    () => new Map(data.nodes.map((node) => [node.id, node])),
    [data]
  );

  const neighbors = useMemo(() => {
    const map = new Map();
    for (const { source, target } of graph.links) {
      if (!map.has(source)) map.set(source, new Set());
      if (!map.has(target)) map.set(target, new Set());
      map.get(source).add(target);
      map.get(target).add(source);
    }
    return map;
  }, [graph]);

  const focusSet = useMemo(
    () =>
      focusNodeId ? withinDepth(focusNodeId, neighbors, FOCUS_DEPTH) : null,
    [focusNodeId, neighbors]
  );

  const hoverSet = useMemo(
    () => (hoverId ? new Set([hoverId, ...(neighbors.get(hoverId) ?? [])]) : null),
    [hoverId, neighbors]
  );

  // 마우스를 올린 노드가 있으면 그 이웃이, 없으면 포커스 범위가 밝게
  const activeSet = hoverSet ?? focusSet;

  const isLinkActive = useCallback(
    (link) => {
      const s = endId(link.source);
      const t = endId(link.target);
      if (hoverId) return s === hoverId || t === hoverId;
      if (focusSet) return focusSet.has(s) && focusSet.has(t);
      return true;
    },
    [hoverId, focusSet]
  );

  const isVisibleId = useCallback(
    (id) => !hidden.has(nodeById.get(id)?.type),
    [hidden, nodeById]
  );

  const visibleNodes = graph.nodes.filter((node) => !hidden.has(node.type));
  const visibleLinks = graph.links.filter(
    (link) => isVisibleId(link.source) && isVisibleId(link.target)
  );
  const chipLinks = focusSet
    ? visibleLinks.filter(
        (link) => focusSet.has(link.source) && focusSet.has(link.target)
      )
    : visibleLinks;

  const counts = useMemo(() => {
    const result = {};
    for (const node of graph.nodes) result[node.type] = (result[node.type] ?? 0) + 1;
    return result;
  }, [graph]);

  // 그래프 영역 크기 측정 (캔버스는 숫자 폭·높이가 필요)
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // 캔버스 글자에 Pretendard가 쓰이도록 필요한 글자를 미리 불러옴
  useEffect(() => {
    const text = graph.nodes.map((node) => node.name).join("");
    document.fonts
      ?.load(`12px "Pretendard Variable"`, text)
      .then(() => setFontTick((tick) => tick + 1))
      .catch(() => {});
  }, [graph]);

  // 배치가 끝난 뒤: 포커스면 그 노드로 이동·확대, 아니면 전체가 보이게
  useEffect(() => {
    const fg = fgRef.current;
    if (!engineDone || !fg) return;
    const node = focusNodeId && nodeById.get(focusNodeId);
    if (node) {
      fg.centerAt(node.x, node.y, 800);
      fg.zoom(2.6, 800);
    } else {
      fg.zoomToFit(600, 60);
    }
  }, [engineDone, focusNodeId, nodeById]);

  const goToNode = useCallback(
    (id) => {
      const node = nodeById.get(id);
      if (!node) return;
      setHidden((prev) => {
        if (!prev.has(node.type)) return prev;
        const next = new Set(prev);
        next.delete(node.type);
        return next;
      });
      setSelectedId(id);
      fgRef.current?.centerAt(node.x, node.y, 600);
    },
    [nodeById]
  );

  const showAll = () => {
    if (focus) {
      router.replace("/graph", { scroll: false });
    } else {
      setSelectedId(null);
      fgRef.current?.zoomToFit(600, 60);
    }
  };

  const toggleType = (type) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const drawNode = useCallback(
    (node, ctx, scale) => {
      const r = radius(node);
      const { color } = TYPE_META[node.type];
      const active = !activeSet || activeSet.has(node.id);
      const hovered = node.id === hoverId;
      const selected = node.id === selectedId;

      ctx.save();
      ctx.globalAlpha = active ? 1 : 0.12;

      // 빛 번짐
      ctx.shadowColor = color;
      ctx.shadowBlur = active ? (node.type === "project" ? 22 : 12) : 0;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (selected || hovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3.5 / scale + 1, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
      }

      const showLabel =
        node.type === "project" ||
        node.type === "tech" ||
        hovered ||
        selected ||
        scale >= LABEL_ZOOM;

      if (showLabel) {
        const isProject = node.type === "project";
        const fontSize = (isProject ? 13 : 11) / scale;
        const full = hovered || selected;
        const text =
          !full && node.name.length > 22 ? `${node.name.slice(0, 21)}…` : node.name;
        ctx.font = `${isProject ? 600 : 400} ${fontSize}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.globalAlpha = active ? (isProject || full ? 1 : 0.75) : 0.12;
        ctx.fillStyle = "#e5e7eb";
        ctx.fillText(text, node.x, node.y + r + 3 / scale);
      }

      ctx.restore();
    },
    // fontTick: 글꼴을 불러온 뒤 다시 그리기
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSet, hoverId, selectedId, fontTick]
  );

  const paintPointerArea = useCallback((node, color, ctx) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius(node) + 2, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  const selectedNode = selectedId ? nodeById.get(selectedId) : null;

  return (
    <div className="flex h-[calc(100vh-136px)] min-h-[560px] flex-col">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label">Graph</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">지식 그래프</h1>
          <ul className="mt-3 flex flex-wrap gap-1.5 text-sm">
            {TYPE_ORDER.map((type) => {
              const off = hidden.has(type);
              const { color, label } = TYPE_META[type];
              return (
                <li key={type}>
                  <button
                    type="button"
                    onClick={() => toggleType(type)}
                    aria-pressed={!off}
                    title={off ? "다시 보이기" : "숨기기"}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-line/60 ${
                      off ? "text-muted line-through opacity-50" : ""
                    }`}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{
                        background: color,
                        boxShadow: off ? "none" : `0 0 8px ${color}`,
                      }}
                    />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm">
          <span
            className="size-2 rounded-full"
            style={{
              background: TYPE_META.project.color,
              boxShadow: `0 0 8px ${TYPE_META.project.color}`,
            }}
          />
          노드 <span className="font-bold">{visibleNodes.length}</span>
        </span>
      </header>

      <div className="mt-5 flex min-h-0 flex-1 gap-4">
        <div
          ref={boxRef}
          // 캔버스 밖으로 나가면 라이브러리가 hover 해제를 알려주지 않아서 직접 해제
          onPointerLeave={() => setHoverId(null)}
          className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-line"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(139,92,246,0.22) 0%, rgba(76,29,149,0.12) 38%, #0b0e14 78%)",
          }}
        >
          {size.width > 0 && (
            <ForceGraphCanvas
              fgRef={fgRef}
              width={size.width}
              height={size.height}
              graphData={data}
              backgroundColor="rgba(0,0,0,0)"
              nodeId="id"
              nodeLabel={() => ""}
              nodeCanvasObject={drawNode}
              nodePointerAreaPaint={paintPointerArea}
              nodeVisibility={(node) => !hidden.has(node.type)}
              linkVisibility={(link) =>
                isVisibleId(endId(link.source)) && isVisibleId(endId(link.target))
              }
              linkColor={(link) =>
                !activeSet
                  ? "rgba(255,255,255,0.16)"
                  : isLinkActive(link)
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(255,255,255,0.035)"
              }
              linkWidth={(link) => (activeSet && isLinkActive(link) ? 1.2 : 0.6)}
              onNodeHover={(node) => setHoverId(node ? node.id : null)}
              onNodeClick={(node) => setSelectedId(node.id)}
              onBackgroundClick={() => setSelectedId(null)}
              onEngineStop={() => setEngineDone(true)}
              warmupTicks={40}
              cooldownTicks={160}
              autoPauseRedraw={false}
            />
          )}

          <button
            type="button"
            onClick={showAll}
            className="absolute left-4 top-4 flex items-center gap-1.5 rounded-lg border border-line bg-bg/80 px-3 py-1.5 text-xs backdrop-blur transition-colors hover:border-accent hover:text-accent"
          >
            <Maximize2 size={13} />
            전체 보기
          </button>

          <span className="absolute bottom-4 left-4 rounded-lg border border-line bg-bg/80 px-3 py-1.5 font-mono text-xs text-muted backdrop-blur">
            {focusSet ? (
              <>
                depth <b className="text-text">{FOCUS_DEPTH}</b>
              </>
            ) : (
              "전체"
            )}{" "}
            · links <b className="text-text">{chipLinks.length}</b>
          </span>
        </div>

        <NodePanel node={selectedNode} counts={counts} onGo={goToNode} />
      </div>
    </div>
  );
}
