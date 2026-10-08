import "server-only";
import { getGraph } from "@/lib/graph";
import { NEEDS_CHECK, getAllProjects, mainEffect } from "@/lib/projects";

// Ctrl K 검색 창에 넘기는 데이터. 화면에 보여줄 필드만 골라서 만든다.
// 저장소 이름·커밋·이메일 등은 넣지 않는다 (graph 노드를 통째로 넘기지 않고 필요한 값만 복사).

const PAGES = [
  { id: "page:home", title: "홈", href: "/", hint: "포트폴리오 첫 화면", keywords: "home 포트폴리오 소개 첫 화면" },
  { id: "page:graph", title: "지식 그래프", href: "/graph", hint: "프로젝트·기술·결정 연결", keywords: "graph 그래프 노드" },
  { id: "page:status", title: "관리", href: "/status", hint: "포트폴리오 완성도", keywords: "status 관리 완성도 체크리스트" },
];

// 아무것도 안 쳤을 때 보여줄 대표 프로젝트
const FEATURED = ["inventory-dashboard", "jarvis"];

const text = (value) => (typeof value === "string" && value !== NEEDS_CHECK ? value : "");

export function getSearchIndex() {
  const projects = getAllProjects();
  const graph = getGraph();

  return {
    pages: PAGES,
    featured: FEATURED,
    projects: projects.map((p) => {
      const effect = mainEffect(p);
      return {
        id: p.id,
        title: p.name,
        summary: text(p.summary),
        group: text(p.group),
        status: text(p.status),
        // 홈 카드의 주황색 대표 효과와 같은 값 (예: "적절 응답" · "15% → 90%")
        effect: effect && text(effect.text) ? { label: text(effect.label), text: effect.text } : null,
        href: `/projects/${p.id}`,
      };
    }),
    tech: graph.nodes
      .filter((node) => node.type === "tech")
      .map((node) => ({
        id: node.id,
        title: node.name,
        projects: node.projects.map((p) => p.name),
        href: `/graph?focus=${encodeURIComponent(node.id)}`,
      }))
      .sort((a, b) => b.projects.length - a.projects.length || a.title.localeCompare(b.title, "ko")),
    decisions: projects.flatMap((p) =>
      (p.decisions ?? [])
        .map((d, i) => ({
          id: `decision:${p.id}:${i + 1}`,
          title: text(d.what),
          why: text(d.why),
          project: p.name,
          // 프로젝트 화면의 결정 카드 (id="decision-1" …)
          href: `/projects/${p.id}#decision-${i + 1}`,
        }))
        .filter((d) => d.title)
    ),
  };
}
