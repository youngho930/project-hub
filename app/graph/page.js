import GraphView from "@/components/graph/GraphView";
import { getGraph } from "@/lib/graph";

export const metadata = {
  title: "지식 그래프 · Project Hub",
};

export default async function GraphPage({ searchParams }) {
  const { focus } = await searchParams;
  const graph = getGraph();

  // 없는 프로젝트 id로 들어오면 포커스 없이 전체 보기
  const focusId =
    typeof focus === "string" &&
    graph.nodes.some((node) => node.id === `project:${focus}`)
      ? focus
      : null;

  return <GraphView graph={graph} focus={focusId} />;
}
