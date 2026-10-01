// 진행 상태 배지: 개발 중은 파랑, 구상 중은 회색 (상태가 없으면 표시 안 함)
const STYLE = {
  "개발 중": "border-blue/40 bg-blue/15 text-blue",
  "구상 중": "border-line bg-line/60 text-muted",
};

export default function StatusBadge({ status, className = "" }) {
  if (!STYLE[status]) return null;
  return (
    <span
      className={`inline-block shrink-0 rounded-md border px-1.5 py-0.5 text-label font-semibold leading-none ${STYLE[status]} ${className}`}
    >
      {status}
    </span>
  );
}
