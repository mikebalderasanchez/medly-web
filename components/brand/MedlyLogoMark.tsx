import * as React from "react";

export type MedlyLogoMarkProps = Omit<React.SVGProps<SVGSVGElement>, "viewBox" | "xmlns"> & {
  /** When true, hides the graphic from assistive tech (use beside visible text). */
  decorative?: boolean;
  title?: string;
};

export function MedlyLogoMark({
  className,
  decorative = false,
  title = "Medly",
  ...rest
}: MedlyLogoMarkProps) {
  const gradId = React.useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      {...rest}
    >
      {!decorative && title ? <title>{title}</title> : null}
      <rect width="500" height="500" rx="100" fill="#2B8FEC" />
      <path
        d="M177.529 138.158H151.176C143.899 138.158 138 144.049 138 151.316V197.368C138 237.337 170.446 269.737 210.471 269.737M210.471 269.737C250.495 269.737 282.941 237.337 282.941 197.368V151.316C282.941 144.049 277.042 138.158 269.765 138.158H243.412M210.471 269.737V312.5C210.471 347.018 238.492 375 273.059 375C307.626 375 335.647 347.018 335.647 312.5V296.053M335.647 296.053C350.202 296.053 362 284.271 362 269.737C362 255.203 350.202 243.421 335.647 243.421C321.092 243.421 309.294 255.203 309.294 269.737C309.294 284.271 321.092 296.053 335.647 296.053ZM243.412 125V151.316M177.529 125V151.316"
        stroke={`url(#${gradId})`}
        strokeWidth="25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id={gradId}
          x1="335.647"
          y1="243.421"
          x2="335.647"
          y2="296.053"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0.5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
