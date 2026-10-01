import GraphView from "@/components/graph/GraphView";
import { getRepoActivities } from "@/lib/github";
import { getGraph } from "@/lib/graph";
import { getPreview } from "@/lib/previews";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "지식 그래프",
  description: "프로젝트마다 쓴 기술, 내린 결정, 만든 효과를 노드로 연결한 지식 그래프. 같은 기술을 쓴 프로젝트끼리 어떻게 이어지는지 볼 수 있습니다.",
  path: "/graph",
});

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

  // ?focus=jarvis (프로젝트) 또는 ?focus=tech:Python (기술 노드). 없는 노드면 포커스 없이 전체 보기
  const candidate =
    typeof focus !== "string" ? null : focus.startsWith("tech:") ? focus : `project:${focus}`;
  const focusId = graph.nodes.some((node) => node.id === candidate) ? candidate : null;

  return <GraphView graph={graph} focus={focusId} />;
}
