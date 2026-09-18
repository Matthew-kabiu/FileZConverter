"use client";

import { Tooltip } from "react-tooltip";

/** Mounted once in root layout. Anchor with data-tooltip-id="app-tooltip". */
export function AppTooltip() {
  return (
    <Tooltip
      id="app-tooltip"
      delayShow={300}
      className="z-50"
      style={{
        backgroundColor: "var(--tt-bg)",
        color: "var(--tt-fg)",
        fontSize: 12,
        borderRadius: 8,
        padding: "6px 10px",
      }}
    />
  );
}
