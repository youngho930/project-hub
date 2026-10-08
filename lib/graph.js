import "server-only";
import { NEEDS_CHECK, PROJECT_STATUS, getAllProjects } from "@/lib/projects";

// 효과 노드 이름. 홈 카드처럼 전·후를 "적절 응답: 15% → 90%" 로 보여주되,
// 그래프 글자는 22자를 넘으면 잘리므로(GraphView) 넘을 때는 예전처럼 "이름: 이후 값" 만 쓴다.
const RESULT_NAME_MAX = 22;
function resultName(result) {
  const short = `${result.label}: ${result.after}`;
  if (!result.before) return short;
  const full = `${result.label}: ${result.before} → ${result.after}`;
  return full.length <= RESULT_NAME_MAX ? full : short;
}

// 프로젝트·구성·결정·효과·기술을 노드로, 그 관계를 링크로 만든다
export function getGraph() {
  const projects = getAllProjects();
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const nodes = new Map();
  const links = new Map();

  const ref = (p) => ({ id: p.id, name: p.name });

  // 같은 두 노드 사이에는 링크 하나만 (방향 무관)
  const link = (a, b) => {
    const key = [a, b].sort().join("|");
    if (!links.has(key)) links.set(key, { source: a, target: b });
  };

  // 기술 노드는 이름이 같으면 하나로 합치고 "확인 필요"는 만들지 않음
  const techNode = (tech, project) => {
    if (typeof tech !== "string" || tech === "" || tech === NEEDS_CHECK) {
      return null;
    }
    const id = `tech:${tech}`;
    if (!nodes.has(id)) {
      nodes.set(id, { id, type: "tech", name: tech, projects: [] });
    }
    const node = nodes.get(id);
    if (!node.projects.some((p) => p.id === project.id)) {
      node.projects.push(ref(project));
    }
    return id;
  };

  for (const project of projects) {
    const projectNodeId = `project:${project.id}`;
    nodes.set(projectNodeId, {
      id: projectNodeId,
      type: "project",
      name: project.name,
      projectId: project.id,
      group: project.group,
      summary: project.summary,
      status: project.status ?? "",
      // 구상 중: 노드는 남기되 흐리게 구분해 그리고, 프로젝트 개수에는 넣지 않음
      idea: project.status === PROJECT_STATUS.idea,
      related: (project.related ?? [])
        .filter((id) => projectById.has(id))
        .map((id) => ref(projectById.get(id))),
    });
  }

  for (const project of projects) {
    const projectNodeId = `project:${project.id}`;
    const owner = { projectId: project.id, projectName: project.name };

    for (const tech of project.tech ?? []) {
      const techId = techNode(tech, project);
      if (techId) link(projectNodeId, techId);
    }

    for (const part of project.parts ?? []) {
      const partId = `part:${project.id}:${part.name}`;
      nodes.set(partId, {
        id: partId,
        type: "part",
        name: part.name,
        repo: part.repo ?? "",
        tech: part.tech ?? [],
        ...owner,
      });
      link(projectNodeId, partId);
      for (const tech of part.tech ?? []) {
        const techId = techNode(tech, project);
        if (techId) link(partId, techId);
      }
    }

    (project.decisions ?? []).forEach((decision, i) => {
      const id = `decision:${project.id}:${i + 1}`;
      nodes.set(id, {
        id,
        type: "decision",
        name: decision.what,
        what: decision.what,
        why: decision.why ?? "",
        rejected: decision.rejected ?? "",
        ...owner,
      });
      link(projectNodeId, id);
    });

    (project.results ?? []).forEach((result, i) => {
      const id = `result:${project.id}:${i + 1}`;
      nodes.set(id, {
        id,
        type: "result",
        name: resultName(result),
        label: result.label,
        after: result.after,
        before: result.before ?? "",
        note: result.note ?? "",
        ...owner,
      });
      link(projectNodeId, id);
    });

    for (const relatedId of project.related ?? []) {
      if (projectById.has(relatedId)) {
        link(projectNodeId, `project:${relatedId}`);
      }
    }
  }

  // 연결 수 (기술 노드 크기에 사용)
  const degree = new Map();
  for (const { source, target } of links.values()) {
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  }

  return {
    nodes: [...nodes.values()].map((node) => ({
      ...node,
      degree: degree.get(node.id) ?? 0,
    })),
    links: [...links.values()],
  };
}
