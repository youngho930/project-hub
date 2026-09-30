import Image from "next/image";

// 브라우저 창 모양 미리보기: 얇은 상단 바(점 3개 + 주소) + 이미지.
// 배포 주소가 있으면 누르면 새 탭으로 열리고, 없으면 누를 수 없음.
// eager: 화면 위쪽에 바로 보이는 경우(프로젝트 화면) 먼저 불러옴
export default function PreviewFrame({ src, url, label, sizes, compact = false, eager = false }) {
  const address = url ? url.replace(/^https?:\/\//, "").replace(/\/$/, "") : label;

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
              compact ? "px-1.5 text-[10px]" : "px-2.5 py-0.5 text-xs"
            }`}
          >
            {address}
          </span>
        )}
      </div>
      <div className="relative aspect-[16/10]">
        <Image
          src={src}
          alt={`${label} 미리보기`}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className="object-cover object-top"
        />
      </div>
    </div>
  );

  if (!url) return frame;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="새 탭에서 열기"
      className="block transition-opacity hover:opacity-90"
    >
      {frame}
    </a>
  );
}
