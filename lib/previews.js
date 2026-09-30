import "server-only";
import fs from "node:fs";
import path from "node:path";

// public/previews 에 <id>.png / .jpg / .webp 가 있으면 미리보기로 쓴다 (JSON 에는 적지 않음).
// 직접 캡처한 이미지를 같은 이름으로 넣기만 하면 그대로 바뀐다.
const DIR = path.join(process.cwd(), "public", "previews");
const EXTENSIONS = ["png", "jpg", "webp"];

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, "manifest.json"), "utf8"));
  } catch {
    return {};
  }
}

// { src: "/previews/<id>.png", capturedAt: "YYYY-MM-DD" | null } 또는 null
export function getPreview(id) {
  const file = EXTENSIONS.map((ext) => `${id}.${ext}`).find((name) =>
    fs.existsSync(path.join(DIR, name))
  );
  if (!file) return null;
  const capturedAt = readManifest()[id]?.capturedAt;
  return {
    src: `/previews/${file}`,
    capturedAt: /^\d{4}-\d{2}-\d{2}$/.test(capturedAt ?? "") ? capturedAt : null,
  };
}
