import manifest from "@/public/previews/manifest.json";

// 미리보기 목록은 public/previews/manifest.json 이 기준 (JSON 은 import 라 빌드에 포함됨).
// 항목: { file: "<id>.png", capturedAt: "YYYY-MM-DD", manual?: true }
// 직접 캡처한 이미지를 넣을 때는 파일을 두고 manifest 에 file 을 적으면 된다.
const FILE_RE = /^[\w-]+\.(png|jpg|webp)$/;

// { src: "/previews/<file>", capturedAt: "YYYY-MM-DD" | null } 또는 null
export function getPreview(id) {
  const entry = manifest[id];
  if (!entry || !FILE_RE.test(entry.file ?? "")) return null;
  const { capturedAt } = entry;
  return {
    src: `/previews/${entry.file}`,
    capturedAt: /^\d{4}-\d{2}-\d{2}$/.test(capturedAt ?? "") ? capturedAt : null,
  };
}
