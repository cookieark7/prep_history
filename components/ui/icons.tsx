import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  article: (p: P) => <Svg {...p}><path d="M3 3h10M3 6h10M3 9h7M3 12h9" /></Svg>,
  cause_graph: (p: P) => (
    <Svg {...p}><rect x="1.5" y="2" width="3.5" height="3.5" /><circle cx="3.2" cy="12" r="1.8" /><rect x="10" y="6" width="4.5" height="4.5" rx="1" /><path d="M5 4l5 3.5M5 11.5l5-2.5" /></Svg>
  ),
  timeline: (p: P) => (
    <Svg {...p}><path d="M1.5 8h13" /><path d="M4 5.5v5M8 4v8M12 6v4" /></Svg>
  ),
  lineage: (p: P) => (
    <Svg {...p}><rect x="6" y="1.5" width="4" height="3" /><rect x="1.5" y="11.5" width="4" height="3" /><rect x="10.5" y="11.5" width="4" height="3" /><path d="M8 4.5v3M3.5 11.5V7.5h9v4" /></Svg>
  ),
  predict_gate: (p: P) => (
    <Svg {...p}><circle cx="8" cy="8" r="6" /><path d="M6.3 6.2a1.8 1.8 0 1 1 2.5 1.7c-.5.2-.8.6-.8 1.1v.4" /><circle cx="8" cy="11.6" r=".4" fill="currentColor" /></Svg>
  ),
  quiz: (p: P) => (
    <Svg {...p}><rect x="2" y="2" width="12" height="12" rx="1" /><path d="M5 8l2 2 4-4.5" /></Svg>
  ),
  callout: (p: P) => <Svg {...p}><path d="M3 2.5v11" /><path d="M6 5h7M6 8h7M6 11h4" /></Svg>,
  anchor: (p: P) => (
    <Svg {...p}><circle cx="8" cy="3.5" r="1.5" /><path d="M8 5v9M4.5 8h7M2.5 10a5.5 5.5 0 0 0 11 0" /></Svg>
  ),
  mnemonic: (p: P) => (
    <Svg {...p}><path d="M8 2a4 4 0 0 0-2.5 7.1V11h5V9.1A4 4 0 0 0 8 2z" /><path d="M6 13.5h4" /></Svg>
  ),
  debate: (p: P) => (
    <Svg {...p}><path d="M2 3h7v5H5l-3 2.5z" /><path d="M11 6h3v5.5L12 10H8.5V8.5" /></Svg>
  ),
  meanwhile: (p: P) => (
    <Svg {...p}><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" /></Svg>
  ),
  deeper: (p: P) => <Svg {...p}><path d="M8 2.5v11M4 9.5l4 4 4-4" /></Svg>,
  test: (p: P) => <Svg {...p}><rect x="2.5" y="2.5" width="11" height="11" rx="1" /><path d="M5.5 8l1.8 1.8L10.8 6" /></Svg>,
  zoom_out: (p: P) => <Svg {...p}><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" /></Svg>,
  clock: (p: P) => <Svg {...p}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></Svg>,
  close: (p: P) => <Svg {...p}><path d="M4 4l8 8M12 4l-8 8" /></Svg>,
  undo: (p: P) => <Svg {...p}><path d="M5 3L2 6l3 3" /><path d="M2 6h7.5a4 4 0 0 1 0 8H7" /></Svg>,
  pin: (p: P) => <Svg {...p}><path d="M6 2h4l-.5 4 2.5 2.5H4L6.5 6z" /><path d="M8 8.5V14" /></Svg>,
  expand: (p: P) => <Svg {...p}><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" /></Svg>,
  more: (p: P) => (
    <Svg {...p}><circle cx="3.5" cy="8" r=".8" fill="currentColor" /><circle cx="8" cy="8" r=".8" fill="currentColor" /><circle cx="12.5" cy="8" r=".8" fill="currentColor" /></Svg>
  ),
  send: (p: P) => <Svg {...p}><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" /></Svg>,
  stop: (p: P) => <Svg {...p}><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" stroke="none" /></Svg>,
  search: (p: P) => <Svg {...p}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></Svg>,
  sidebar: (p: P) => <Svg {...p}><rect x="1.5" y="2.5" width="13" height="11" rx="1" /><path d="M6 2.5v11" /></Svg>,
  chevronDown: (p: P) => <Svg {...p}><path d="M4 6l4 4 4-4" /></Svg>,
  chevronUp: (p: P) => <Svg {...p}><path d="M4 10l4-4 4 4" /></Svg>,
  chevronRight: (p: P) => <Svg {...p}><path d="M6 4l4 4-4 4" /></Svg>,
  back: (p: P) => <Svg {...p}><path d="M10 3L5 8l5 5" /></Svg>,
  note: (p: P) => <Svg {...p}><path d="M3 2.5h10v8l-3 3H3z" /><path d="M10 13.5v-3h3" /></Svg>,
  select: (p: P) => <Svg {...p}><path d="M3 2l9.5 5-4.2 1.2L6.5 12.5z" /></Svg>,
  path: (p: P) => <Svg {...p}><circle cx="3" cy="12.5" r="1.5" /><circle cx="13" cy="3.5" r="1.5" /><path d="M4.3 11.5C7 10 6 6 11.7 4.4" /></Svg>,
  fit: (p: P) => <Svg {...p}><rect x="4.5" y="4.5" width="7" height="7" /><path d="M1.5 4.5v-3h3M14.5 4.5v-3h-3M1.5 11.5v3h3M14.5 11.5v3h-3" /></Svg>,
  back_trace: (p: P) => <Svg {...p}><path d="M13.5 8h-11M6 4.5L2.5 8 6 11.5" /></Svg>,
  ripple: (p: P) => <Svg {...p}><circle cx="4" cy="8" r="1.5" /><path d="M7.5 5a4 4 0 0 1 0 6M10.5 3a7 7 0 0 1 0 10" /></Svg>,
  download: (p: P) => <Svg {...p}><path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" /></Svg>,
  theme: (p: P) => <Svg {...p}><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5v11a5.5 5.5 0 0 0 0-11z" fill="currentColor" /></Svg>,
  keyboard: (p: P) => <Svg {...p}><rect x="1.5" y="4" width="13" height="8" rx="1" /><path d="M4 6.5h.01M6.5 6.5h.01M9 6.5h.01M11.5 6.5h.01M5 9.5h6" /></Svg>,
  check: (p: P) => <Svg {...p}><path d="M3 8.5l3 3 7-7" /></Svg>,
  cross: (p: P) => <Svg {...p}><path d="M4 4l8 8M12 4l-8 8" /></Svg>,
  eye: (p: P) => <Svg {...p}><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></Svg>,
  shuffle: (p: P) => <Svg {...p}><path d="M2 4.5h2.5l7 7H14M2 11.5h2.5l2-2M9.5 6.5l2-2H14M12.5 3l1.5 1.5-1.5 1.5M12.5 10l1.5 1.5-1.5 1.5" /></Svg>,
  grip: (p: P) => (
    <Svg {...p}><circle cx="6" cy="4" r=".7" fill="currentColor" /><circle cx="10" cy="4" r=".7" fill="currentColor" /><circle cx="6" cy="8" r=".7" fill="currentColor" /><circle cx="10" cy="8" r=".7" fill="currentColor" /><circle cx="6" cy="12" r=".7" fill="currentColor" /><circle cx="10" cy="12" r=".7" fill="currentColor" /></Svg>
  ),
};

export type IconName = keyof typeof Icon;
