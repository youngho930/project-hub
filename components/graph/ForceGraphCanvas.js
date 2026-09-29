"use client";

import { useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";

// next/dynamic(ssr: false)로 불러오는 캔버스. ref는 fgRef prop으로 받아 그대로 연결
export default function ForceGraphCanvas({ fgRef, ...props }) {
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-150);
    fg.d3Force("link")?.distance((link) =>
      link.source.type === "project" && link.target.type === "project"
        ? 110
        : 42
    );
  }, [fgRef]);

  return <ForceGraph2D ref={fgRef} {...props} />;
}
