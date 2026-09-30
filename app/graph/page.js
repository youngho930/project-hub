import GraphView from "@/components/graph/GraphView";
import { getRepoActivities } from "@/lib/github";
import { getGraph } from "@/lib/graph";
import { getPreview } from "@/lib/previews";

export const metadata = {
  title: "지식 그래프 · Project Hub",
};

export default async function GraphPage({ searchParams }) {
  const { focus } = await searchParams;
  const base = getGraph();
  const github = await getRepoActivities();

  // 프로젝트 화면과 같은 기준(GitHub 의 private 값)으로 비공개 저장소는 이름·링크 대신 표시만
  const graph = {
    ...base,
    nodes: base.nodes.map((node) => {
      if (node.type === "part" && github.repos[node.repo]?.private) {
        return { ...node, repo: "", repoPrivate: true };
      }
      // 프로젝트 노드: 미리보기 이미지가 있으면 경로와 크기만 추가
      if (node.type === "project") {
        const preview = getPreview(node.projectId);
        if (preview) {
          const { src, width, height } = preview;
          return { ...node, preview: { src, width, height } };
        }
      }
      return node;
    }),
  };

  // 없는 프로젝트 id로 들어오면 포커스 없이 전체 보기
  const focusId =
    typeof focus === "string" &&
    graph.nodes.some((node) => node.id === `project:${focus}`)
      ? focus
      : null;

  return <GraphView graph={graph} focus={focusId} />;
}
