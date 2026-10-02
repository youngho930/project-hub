import "server-only";
import { NEEDS_CHECK, getAllProjects } from "@/lib/projects";

const API = "https://api.github.com";
const REVALIDATE = 600; // 10분

export const GITHUB_STATUS = {
  connected: "연결됨",
  unset: "미설정",
  error: "오류",
};

// 토큰은 요청 헤더에만 넣고, 로그·에러 메시지에는 절대 쓰지 않음
function authHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  };
}

// 실패하면 상태 코드만 담은 에러를 던짐 (응답 본문·헤더는 담지 않음)
async function githubGet(path) {
  const res = await fetch(`${API}${path}`, {
    headers: authHeaders(),
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) {
    const error = new Error(`GitHub 요청 실패 (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

const hasToken = () => Boolean(process.env.GITHUB_TOKEN);

export async function getGitHubStatus() {
  if (!hasToken()) return GITHUB_STATUS.unset;
  try {
    await githubGet("/rate_limit");
    return GITHUB_STATUS.connected;
  } catch {
    return GITHUB_STATUS.error;
  }
}

const isRepo = (value) =>
  typeof value === "string" && value.trim() !== "" && value !== NEEDS_CHECK;

// 프로젝트의 repo 와 parts 안의 repo (빈 값·"확인 필요" 제외, 중복 제거)
export function reposOf(project) {
  const repos = [project.repo, ...(project.parts ?? []).map((part) => part.repo)];
  return [...new Set(repos.filter(isRepo))];
}

async function fetchRepo(repo) {
  try {
    const [info, commits] = await Promise.all([
      githubGet(`/repos/${repo}`),
      // 커밋이 하나도 없는 저장소는 409 → 빈 목록으로 처리
      githubGet(`/repos/${repo}/commits?per_page=3`).catch((error) => {
        if (error.status === 409) return [];
        throw error;
      }),
    ]);

    // 비공개 저장소는 마지막 활동 시각만 남기고 나머지는 여기서 버림
    // (브라우저로 넘어가는 데이터에 커밋 메시지·해시·링크가 아예 없도록)
    if (info.private) {
      return { repo, ok: true, private: true, pushedAt: info.pushed_at };
    }

    return {
      repo,
      ok: true,
      private: false,
      pushedAt: info.pushed_at,
      commits: commits.map((c) => ({
        message: (c.commit?.message ?? "").split("\n")[0],
        date: c.commit?.author?.date ?? c.commit?.committer?.date ?? null,
        sha: c.sha.slice(0, 7),
        url: c.html_url,
      })),
    };
  } catch {
    // 이 저장소만 "불러오기 실패", 페이지 전체는 그대로
    return { repo, ok: false };
  }
}

// 모든 프로젝트의 저장소를 동시에 조회해서 { repo → 활동 } 으로 반환
export async function getRepoActivities() {
  const status = await getGitHubStatus();
  if (status !== GITHUB_STATUS.connected) return { status, repos: {} };

  const repos = [...new Set(getAllProjects().flatMap(reposOf))];
  const results = await Promise.all(repos.map(fetchRepo));
  return {
    status,
    repos: Object.fromEntries(results.map((result) => [result.repo, result])),
  };
}

// 첫 화면 LIVE 패널용: 모든 프로젝트 저장소 중 가장 최근 커밋 시각 하나만 (ISO 문자열 또는 null).
// 공개 저장소는 커밋 시각, 비공개 저장소는 프로젝트 화면에도 보이는 마지막 활동 시각
export async function getLatestCommitAt() {
  const { status, repos } = await getRepoActivities();
  const times = Object.values(repos)
    .filter((repo) => repo.ok)
    .flatMap((repo) => (repo.private ? [repo.pushedAt] : (repo.commits ?? []).map((c) => c.date)))
    .map((iso) => (typeof iso === "string" ? Date.parse(iso) : NaN))
    .filter((ms) => !Number.isNaN(ms));
  return { status, at: times.length ? new Date(Math.max(...times)).toISOString() : null };
}
