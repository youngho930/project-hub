import { usePathname } from "next/navigation";

// usePathname() 과 같지만 "/index" 를 "/" 로 맞춤.
// Vercel 이 첫 화면을 캐시용으로 다시 만들 때(ISR) 서버에서는 주소가 "/index" 로 잡혀,
// 사이드바 "홈" 현재 위치 표시 등이 브라우저(주소 "/")와 달라지면서 하이드레이션 불일치(React #418)가 나고
// React 가 화면 전체를 다시 그렸음 (아이폰에서 첫 방문 연출 캔버스까지 지워지던 원인)
export function useSitePathname() {
  const pathname = usePathname();
  return pathname === "/index" ? "/" : pathname;
}
