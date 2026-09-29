const NEEDS_CHECK = "확인 필요";

export function CheckBadge() {
  return (
    <span className="inline-block rounded-md border border-yellow-400/40 bg-yellow-400/15 px-2 py-0.5 text-xs font-semibold text-yellow-300">
      {NEEDS_CHECK}
    </span>
  );
}

// "확인 필요"는 노란 배지로, 그 외엔 글자 그대로
export function Value({ value, children }) {
  if (value === NEEDS_CHECK) return <CheckBadge />;
  return children ?? value;
}
