import manifest from "@/public/previews/manifest.json";

// 미리보기 목록은 public/previews/manifest.json 이 기준 (JSON 은 import 라 빌드에 포함됨).
// 항목: { file: "<id>.png", width, height, capturedAt: "YYYY-MM-DD", manual?: true }
// 직접 캡처한 이미지를 넣을 때는 파일을 두고 manifest 에 file 과 실제 가로·세로 크기를 적으면 된다.
const FILE_RE = /^[\w-]+\.(png|jpg|webp)$/;
// 크기가 없으면 캡처 기본 화면(1440×900) 비율로 표시
const DEFAULT_SIZE = { width: 1440, height: 900 };

const isSize = (value) => Number.isInteger(value) && value > 0;

// { src: "/previews/<file>", width, height, capturedAt: "YYYY-MM-DD" | null } 또는 null
export function getPreview(id) {
  const entry = manifest[id];
  if (!entry || !FILE_RE.test(entry.file ?? "")) return null;
  const { capturedAt } = entry;
  const size =
    isSize(entry.width) && isSize(entry.height)
      ? { width: entry.width, height: entry.height }
      : DEFAULT_SIZE;
  return {
    src: `/previews/${entry.file}`,
    ...size,
    capturedAt: /^\d{4}-\d{2}-\d{2}$/.test(capturedAt ?? "") ? capturedAt : null,
  };
}
