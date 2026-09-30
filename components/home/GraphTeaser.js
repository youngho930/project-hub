import { TYPE_META } from "@/components/graph/types";

// 지식 그래프를 정적인 작은 그림으로 (서버에서 SVG 로 그림, 자바스크립트 없음).
// 프로젝트는 안쪽 원, 기술은 바깥 원, 결정·효과·구성은 연결된 프로젝트 근처에 둔다.
const SIZE = 320;
const C = SIZE / 2;
const RING = { project: 70, tech: 138, part: 104, decision: 112, result: 120 };
const DOT = { project: 6, tech: 3.2, part: 2.8, decision: 2, result: 2 };

// 같은 입력이면 항상 같은 값 (id 문자열 → 0~1)
function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

function layout(graph) {
  const projects = graph.nodes.filter((node) => node.type === "project");
  const angle = new Map(
    projects.map((node, i) => [node.id, (i / projects.length) * Math.PI * 2 - Math.PI / 2])
  );
  const neighbors = new Map();
  for (const { source, target } of graph.links) {
    for (const [a, b] of [[source, target], [target, source]]) {
      if (!neighbors.has(a)) neighbors.set(a, []);
      neighbors.get(a).push(b);
    }
  }

  const pos = new Map();
  for (const node of graph.nodes) {
    let a = angle.get(node.id);
    if (a === undefined) {
      // 연결된 프로젝트들의 평균 방향 + 약간의 흩어짐
      const linked = (neighbors.get(node.id) ?? []).filter((id) => angle.has(id));
      const x = linked.reduce((sum, id) => sum + Math.cos(angle.get(id)), 0);
      const y = linked.reduce((sum, id) => sum + Math.sin(angle.get(id)), 0);
      const base = linked.length ? Math.atan2(y, x) : hash(node.id) * Math.PI * 2;
      a = base + (hash(node.id) - 0.5) * 0.9;
    }
    const r = (RING[node.type] ?? 110) + (hash(`${node.id}r`) - 0.5) * 18;
    pos.set(node.id, { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r });
  }
  return pos;
}

export default function GraphTeaser({ graph }) {
  const pos = layout(graph);
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="지식 그래프 미리보기"
      className="h-auto w-full max-w-[320px]"
    >
      <defs>
        <radialGradient id="teaser-glow">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <filter id="teaser-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <circle cx={C} cy={C} r={C} fill="url(#teaser-glow)" />
      <g stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.6">
        {graph.links.map(({ source, target }) => {
          const a = pos.get(source);
          const b = pos.get(target);
          if (!a || !b) return null;
          return <line key={`${source}|${target}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      {graph.nodes.map((node) => {
        const p = pos.get(node.id);
        const color = TYPE_META[node.type]?.color ?? "#8b93a3";
        const r = DOT[node.type] ?? 2;
        return (
          <g key={node.id}>
            {node.type === "project" && (
              <circle cx={p.x} cy={p.y} r={r + 5} fill={color} opacity="0.45" filter="url(#teaser-blur)" />
            )}
            <circle cx={p.x} cy={p.y} r={r} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
