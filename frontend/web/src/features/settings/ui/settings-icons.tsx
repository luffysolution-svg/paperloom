// 设置弹窗「外观」「整库迁移」「MCP 与 Skills」的图标。别的分栏的图标在各自的功能里（settings-icon.tsx），见 20261112-功能登记表。
import type { SVGProps } from "react";

export function IconPalette(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 3a9 9 0 1 0 9 9c0-.5-.04-1-.12-1.48a5 5 0 0 1-6.4-6.4A9 9 0 0 0 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="8.5" cy="10" r="1.1" fill="currentColor" />
      <circle cx="11.5" cy="7.2" r="1.1" fill="currentColor" />
      <circle cx="15.2" cy="9" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function IconArchive(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2A1.5 1.5 0 0 1 18.5 11h-13A1.5 1.5 0 0 1 4 9.5v-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M5.5 11v7.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V11" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 14.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlug(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M8 3v5M16 3v5M6 8h12v3a6 6 0 0 1-12 0V8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
