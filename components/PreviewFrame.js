import Image from "next/image";

// 이미지 영역 최대 높이 (화면 높이 기준). 넘으면 비율을 유지한 채 폭을 줄이고 가운데 정렬
const MAX_IMAGE_VH = 70;

// 브라우저 창 모양 미리보기: 얇은 상단 바(점 3개 + 주소) + 이미지.
// 이미지 영역은 실제 가로·세로 비율(width, height)을 따르고, 이미지는 잘리지 않게 전체를 보여줌.
// 배포 주소가 있으면 누르면 새 탭으로 열리고, 없으면 누를 수 없음.
// compact: 좁은 패널용(높이 제한 없음) / eager: 화면 위쪽에 바로 보이는 경우(프로젝트 화면) 먼저 불러옴
export default function PreviewFrame({
  src,
  width,
  height,
  url,
  label,
  sizes,
  compact = false,
  eager = false,
}) {
  const address = url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : label;
  const ratio = width > 0 && height > 0 ? width / height : 16 / 10;

  // 틀 폭 = min(부모 폭, 최대 높이 × 비율) → 이미지 높이가 최대 높이를 넘지 않음
  const outerStyle = compact
    ? undefined
    : { width: `min(100%, calc(${MAX_IMAGE_VH}vh * ${ratio.toFixed(4)}))` };

  const frame = (
    <div className="overflow-hidden rounded-xl border border-line bg-inset">
      <div
        className={`flex items-center gap-1.5 border-b border-line bg-card ${
          compact ? "px-2.5 py-1.5" : "px-3.5 py-2"
        }`}
      >
        {["bg-red/70", "bg-orange/70", "bg-green/70"].map((color) => (
          <span
            key={color}
            className={`shrink-0 rounded-full ${color} ${compact ? "size-1.5" : "size-2.5"}`}
          />
        ))}
        {address && (
          <span
            className={`ml-2 min-w-0 flex-1 truncate rounded-md bg-inset text-muted ${
              compact ? "px-1.5 text-label" : "px-2.5 py-0.5 text-caption"
            }`}
          >
            {address}
          </span>
        )}
      </div>
      <div className="relative" style={{ aspectRatio: `${width || 16} / ${height || 10}` }}>
        <Image
          src={src}
          alt={`${label} 미리보기`}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className="object-contain"
        />
      </div>
    </div>
  );

  if (!url) {
    return (
      <div className="mx-auto" style={outerStyle}>
        {frame}
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="새 탭에서 열기"
      className="mx-auto block transition-opacity hover:opacity-90"
      style={outerStyle}
    >
      {frame}
    </a>
  );
}
