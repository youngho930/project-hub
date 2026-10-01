import manifest from "@/public/previews/manifest.json";

// 미리보기 목록은 public/previews/manifest.json 이 기준 (JSON 은 import 라 빌드에 포함됨).
// 항목: { file: "<id>.png", width, height, capturedAt: "YYYY-MM-DD", manual?: true, gallery?: [...] }
// 직접 캡처한 이미지를 넣을 때는 파일을 두고 manifest 에 file 과 실제 가로·세로 크기를 적으면 된다.
// gallery: 절차 시연 캡처 목록 [{ file, width, height, caption }] — 프로젝트 화면의 WORKFLOW 영역
// 파일은 public/previews 바로 아래나 한 단계 폴더 안 (예: "qc-report-system/01-write.webp")
const FILE_RE = /^(?:[\w-]+\/)?[\w-]+\.(png|jpg|webp)$/;
// 크기가 없으면 캡처 기본 화면(1440×900) 비율로 표시
const DEFAULT_SIZE = { width: 1440, height: 900 };

const isSize = (value) => Number.isInteger(value) && value > 0;

const sizeOf = (entry) =>
  isSize(entry.width) && isSize(entry.height)
    ? { width: entry.width, height: entry.height }
    : DEFAULT_SIZE;

// { src: "/previews/<file>", width, height, capturedAt: "YYYY-MM-DD" | null } 또는 null
export function getPreview(id) {
  const entry = manifest[id];
  if (!entry || !FILE_RE.test(entry.file ?? "")) return null;
  const { capturedAt } = entry;
  return {
    src: `/previews/${entry.file}`,
    ...sizeOf(entry),
    capturedAt: /^\d{4}-\d{2}-\d{2}$/.test(capturedAt ?? "") ? capturedAt : null,
  };
}

// 절차 캡처 [{ src, width, height, caption }]. 없으면 빈 목록
export function getGallery(id) {
  const gallery = manifest[id]?.gallery;
  if (!Array.isArray(gallery)) return [];
  return gallery
    .filter((step) => FILE_RE.test(step?.file ?? ""))
    .map((step) => ({
      src: `/previews/${step.file}`,
      ...sizeOf(step),
      caption: typeof step.caption === "string" ? step.caption : "",
    }));
}
