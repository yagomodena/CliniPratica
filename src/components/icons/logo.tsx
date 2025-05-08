import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement> & { textClassName?: string, dotClassName?: string }) {
  return (
    <div className="flex items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary mr-2 h-8 w-8"
        {...props}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M12 5v3" />
        <path d="M10.5 6.5H13.5" />

      </svg>
      <span className={`text-2xl font-bold ${props.textClassName || 'text-primary'}`}>
        Clini<span className={props.dotClassName || 'text-foreground'}>Prática</span>
      </span>
    </div>
  );
}
