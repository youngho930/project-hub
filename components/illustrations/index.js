// 미리보기 이미지가 없는 프로젝트용 일러스트 (직접 그린 SVG, 외부 이미지 없음).
// 첫 화면 카드와 지식 그래프 패널 썸네일에만 쓴다 (프로젝트 화면의 PREVIEW 에는 쓰지 않음).
// 캡처 이미지(public/previews + manifest.json)와는 따로 관리: 캡처가 생기면 캡처가 우선.
// 크기는 16:10 (320×200), 선과 면 위주. 실제 글자는 넣지 않고 막대로 표현.

const LINE = "#2c3448";
const PANEL = "#171d2a";
const PANEL_HI = "#1c2334";
const BAR = "#3a4358";
const BAR_DIM = "#283044";
const VIOLET = "#a78bfa";
const AMBER = "#f59e0b";
const ORANGE = "#f97316";
const GREEN = "#22c55e";
const BLUE = "#60a5fa";

function Frame({ label, children }) {
  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label={label}
      className="h-full w-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

// Job Jarvis: 메일함에서 "마감 임박" 알림 카드가 올라와 쌓인 모양
function MailAlerts() {
  const cards = [
    { y: 34, opacity: 0.45 },
    { y: 58, opacity: 0.7 },
    { y: 82, opacity: 1, front: true },
  ];
  return (
    <Frame label="마감 임박 공고 알림 메일 일러스트">
      <defs>
        <radialGradient id="ja-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={VIOLET} stopOpacity="0.22" />
          <stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="96" rx="130" ry="86" fill="url(#ja-glow)" />

      {cards.map(({ y, opacity, front }) => (
        <g key={y} opacity={opacity}>
          <rect
            x="82"
            y={y}
            width="156"
            height="46"
            rx="8"
            fill={front ? PANEL_HI : PANEL}
            stroke={front ? VIOLET : LINE}
            strokeOpacity={front ? 0.7 : 1}
          />
          {/* 마감 임박 표시 (주황 알약) + 공고 제목·회사 막대 */}
          <rect x="94" y={y + 11} width="26" height="10" rx="5" fill={ORANGE} fillOpacity="0.18" stroke={ORANGE} strokeOpacity="0.8" />
          <rect x="126" y={y + 13} width="62" height="6" rx="3" fill={BAR} />
          <rect x="94" y={y + 28} width="84" height="5" rx="2.5" fill={BAR_DIM} />
          {/* 시계 */}
          <circle cx="216" cy={y + 23} r="8" stroke={ORANGE} strokeWidth="1.5" strokeOpacity="0.85" />
          <path d={`M216 ${y + 18.5} V${y + 23} L219.5 ${y + 25}`} stroke={ORANGE} strokeWidth="1.5" />
        </g>
      ))}
      {/* 새 알림 점 */}
      <circle cx="236" cy="84" r="5" fill={ORANGE} />
      <circle cx="236" cy="84" r="9" stroke={ORANGE} strokeOpacity="0.35" />

      {/* 메일함 (카드 아래쪽을 가림) */}
      <path
        d="M66 146 L96 118 H224 L254 146 V170 A8 8 0 0 1 246 178 H74 A8 8 0 0 1 66 170 Z"
        fill="#121724"
        stroke={LINE}
        strokeWidth="1.5"
      />
      <path d="M66 146 H122 L130 158 H190 L198 146 H254" stroke={VIOLET} strokeOpacity="0.55" strokeWidth="1.5" />
    </Frame>
  );
}

// 검사 보고·승인: 작성 → 검토 → 승인 세 단계와 체크
function ApprovalFlow() {
  const steps = [160 - 92, 160, 160 + 92];
  return (
    <Frame label="작성, 검토, 승인 세 단계 결재 흐름 일러스트">
      <defs>
        <radialGradient id="qa-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.16" />
          <stop offset="100%" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="92" rx="150" ry="80" fill="url(#qa-glow)" />

      {/* 단계 사이 화살표 */}
      {[0, 1].map((i) => (
        <g key={i} stroke={i === 0 ? AMBER : GREEN} strokeOpacity="0.7" strokeWidth="1.5">
          <path d={`M${steps[i] + 34} 88 H${steps[i + 1] - 36}`} strokeDasharray="3 5" />
          <path d={`M${steps[i + 1] - 42} 83 L${steps[i + 1] - 36} 88 L${steps[i + 1] - 42} 93`} />
        </g>
      ))}

      {steps.map((x, i) => (
        <g key={x}>
          <rect
            x={x - 28}
            y="60"
            width="56"
            height="56"
            rx="14"
            fill={i === 2 ? "#13251b" : PANEL_HI}
            stroke={i === 2 ? GREEN : LINE}
            strokeOpacity={i === 2 ? 0.8 : 1}
            strokeWidth="1.5"
          />
          {/* 단계 이름 대신 막대 */}
          <rect x={x - 18} y="132" width="36" height="5" rx="2.5" fill={BAR} />
          <rect x={x - 12} y="143" width="24" height="4" rx="2" fill={BAR_DIM} />
        </g>
      ))}

      {/* 1. 작성: 문서 + 펜 */}
      <g stroke={AMBER} strokeWidth="1.5">
        <path d="M58 72 H74 L80 78 V102 H58 Z" fill={AMBER} fillOpacity="0.08" />
        <path d="M62 84 H74 M62 90 H74 M62 96 H70" strokeOpacity="0.8" />
        <path d="M78 98 L88 88 L91 91 L81 101 L77 102 Z" fill={PANEL_HI} />
      </g>
      {/* 2. 검토: 돋보기 */}
      <g stroke={AMBER} strokeWidth="1.5">
        <circle cx="157" cy="85" r="10" fill={AMBER} fillOpacity="0.08" />
        <path d="M164 92 L172 100" strokeWidth="2.5" />
        <path d="M152 85 H162 M157 80 V90" strokeOpacity="0.6" />
      </g>
      {/* 3. 승인: 체크 */}
      <circle cx="252" cy="88" r="14" fill={GREEN} fillOpacity="0.16" stroke={GREEN} strokeWidth="1.5" />
      <path d="M245 88 L250 93 L259 83" stroke={GREEN} strokeWidth="2.5" />

      {/* 끝난 단계 표시 (작은 체크 배지) */}
      {steps.slice(0, 2).map((x) => (
        <g key={x}>
          <circle cx={x + 26} cy="62" r="7" fill={GREEN} />
          <path d={`M${x + 22.5} 62 L${x + 25} 64.5 L${x + 29.5} 59.5`} stroke="#0b0e14" strokeWidth="1.8" />
        </g>
      ))}
    </Frame>
  );
}

// Jira 주간보고: 흩어진 이슈 카드가 한 장의 주간 보고서로 모이는 모양
function WeeklyReport() {
  const issues = [
    { x: 30, y: 30, color: BLUE },
    { x: 46, y: 70, color: VIOLET },
    { x: 26, y: 110, color: AMBER },
    { x: 50, y: 148, color: GREEN },
  ];
  return (
    <Frame label="이슈 카드가 주간 보고서로 모이는 일러스트">
      <defs>
        <radialGradient id="jw-glow" cx="70%" cy="50%" r="50%">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.18" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="210" cy="100" rx="120" ry="90" fill="url(#jw-glow)" />

      {/* 이슈에서 보고서로 모이는 선 */}
      {issues.map(({ x, y, color }) => (
        <path
          key={y}
          d={`M${x + 72} ${y + 11} C ${x + 110} ${y + 11}, 160 100, 190 100`}
          stroke={color}
          strokeOpacity="0.45"
          strokeWidth="1.2"
          strokeDasharray="2 4"
        />
      ))}

      {issues.map(({ x, y, color }) => (
        <g key={`c${y}`}>
          <rect x={x} y={y} width="72" height="22" rx="5" fill={PANEL} stroke={LINE} />
          <rect x={x} y={y} width="4" height="22" rx="2" fill={color} />
          <rect x={x + 12} y={y + 8.5} width="36" height="5" rx="2.5" fill={BAR} />
          <circle cx={x + 60} cy={y + 11} r="3.5" fill={color} fillOpacity="0.7" />
        </g>
      ))}

      {/* 주간 보고서 */}
      <rect x="190" y="30" width="100" height="140" rx="10" fill={PANEL_HI} stroke={BLUE} strokeOpacity="0.6" strokeWidth="1.5" />
      <rect x="202" y="44" width="52" height="7" rx="3.5" fill={BAR} />
      {/* 월~금 칸 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={202 + i * 16}
          y="60"
          width="12"
          height="12"
          rx="3"
          fill={i < 4 ? BLUE : "none"}
          fillOpacity={i < 4 ? 0.25 + i * 0.12 : 0}
          stroke={BLUE}
          strokeOpacity="0.5"
        />
      ))}
      {/* 막대 그래프 */}
      <path d="M202 128 H278" stroke={LINE} />
      {[18, 30, 22, 38, 28].map((h, i) => (
        <rect key={i} x={206 + i * 15} y={128 - h} width="9" height={h} rx="2" fill={i === 3 ? AMBER : BLUE} fillOpacity={i === 3 ? 0.85 : 0.5} />
      ))}
      <rect x="202" y="140" width="76" height="5" rx="2.5" fill={BAR_DIM} />
      <rect x="202" y="151" width="56" height="5" rx="2.5" fill={BAR_DIM} />
    </Frame>
  );
}

export const ILLUSTRATIONS = {
  "job-jarvis": MailAlerts,
  "qc-report-system": ApprovalFlow,
  "jira-weekly-report": WeeklyReport,
};
