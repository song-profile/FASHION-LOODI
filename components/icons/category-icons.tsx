import type { SVGProps } from "react";

const baseProps: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function OuterwearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 4l-3.5 2.5L5 11v9h14v-9l1.5-4.5L17 4l-2.5 2.5h-5L7 4z" />
      <path d="M12 6.5V20" />
      <path d="M9.5 6.5l-1 1.5" />
    </svg>
  );
}

export function TopsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 4l-4 3 2 3 3-1.5V20h12V8.5L23 10l-2-3-4-3-3 2.5h-4L7 4z" />
    </svg>
  );
}

export function BottomsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 3h14l-1.2 17.5h-4.3L12 9.5 10.5 20.5H6.2L5 3z" />
      <path d="M5 3l14 0" />
    </svg>
  );
}

export function ShoesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 14.5V18a2 2 0 002 2h14a2 2 0 002-2v-1.5a3 3 0 00-1.6-2.7L13 11l-2-3.5L8 5l-2 1.2-2 3.8 1 2.5-2 2z" />
      <path d="M8 11l1.5 1.5" />
      <path d="M11.5 12.7l1 1" />
    </svg>
  );
}
