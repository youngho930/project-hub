import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 휴대폰 홈 화면용 아이콘 (180×180 PNG). app/icon.svg 와 같은 그림을 쓰되,
// iOS 가 모서리를 알아서 둥글게 깎으므로 배경은 꽉 찬 사각형으로.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const svg = (await readFile(join(process.cwd(), "app", "icon.svg"), "utf8")).replace(
    'rx="7"',
    'rx="0"'
  );
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#131823" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={180} height={180} alt="" />
      </div>
    ),
    size
  );
}
