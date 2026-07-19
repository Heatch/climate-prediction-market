import type { CSSProperties } from "react"

import { CATEGORY_ACCENTS, CATEGORY_SYMBOLS } from "@/lib/markets/categories"
import type { MarketCategory } from "@/lib/markets/types"

interface HazardIconProps {
  category: MarketCategory
  className?: string
  glow?: boolean
}

/**
 * A compact, single-stroke hazard mark for interface chrome.
 *
 * These icons are intentionally decorative: the category name is always
 * provided by adjacent text or the surrounding control's accessible label.
 */
export default function HazardIcon({
  category,
  className,
  glow = true,
}: HazardIconProps) {
  const accent = CATEGORY_ACCENTS[category]
  const mark = (() => {
    switch (category) {
      case "hurricane":
        return (
          <>
            <path d="M3.5 9.5C6 4.9 11.8 3.2 16.3 5.8c2.2 1.3 3.7 3.5 4.1 6-2-1.8-5-2.2-7.4-.9-2.2 1.2-3.2 3.8-2.3 6" />
            <path d="M20.5 14.5c-2.5 4.6-8.3 6.3-12.8 3.7-2.2-1.3-3.7-3.5-4.1-6 2 1.8 5 2.2 7.4.9 2.2-1.2 3.2-3.8 2.3-6" />
            <circle
              cx="12"
              cy="12"
              r="1.35"
              fill="currentColor"
              stroke="none"
            />
          </>
        )
      case "drought":
        return (
          <>
            <circle cx="17" cy="6" r="2.6" fill="currentColor" stroke="none" />
            <path d="M17 1.5v1.2M17 9.3v1.2M12.5 6h1.2M20.3 6h1.2M13.8 2.8l.9.9M20.2 2.8l-.9.9M3 13h18M12 13v3l-2 2 2 3M12 16l3 2" />
          </>
        )
      case "temperature":
        return (
          <>
            <path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z" />
            <path d="M12 7v9" />
            <circle cx="12" cy="18" r="2" fill="currentColor" stroke="none" />
          </>
        )
      case "rainfall":
        return (
          <>
            <path d="M5.5 13h12.2a3.3 3.3 0 0 0 .2-6.6 5 5 0 0 0-9.5-1.3A4.1 4.1 0 0 0 5.5 13Z" />
            <path d="m8 16-1 3m5-3-1 4m5-4-1 3" />
          </>
        )
      case "flooding":
        return (
          <>
            <path d="m4 11 6-5 6 5v5M7 15v-4h6v4" />
            <path d="M2.5 17c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5" />
          </>
        )
      case "crop-yield":
        return (
          <path d="M12 21V4M12 8C9.3 8 8 6.7 8 4c2.7 0 4 1.3 4 4Zm0 4c2.7 0 4-1.3 4-4-2.7 0-4 1.3-4 4Zm0 4c-2.7 0-4-1.3-4-4 2.7 0 4 1.3 4 4Zm0 4c2.7 0 4-1.3 4-4-2.7 0-4 1.3-4 4Z" />
        )
      case "wildfire":
        return (
          <>
            <path d="M13 2.5c.8 3.5-2.4 5-1 7.6.7 1.2 2.3.7 2.5-.9 2.5 2 3.8 4.3 3 7-1 2.9-3.4 4.8-6.4 4.8-3.6 0-6.4-2.7-6.4-6.2 0-2.8 1.7-5.2 4.5-7.2-.2 2.3.6 3.9 2 4.5-.7-3.4 2.4-5.4 1.8-9.6Z" />
            <path
              d="M12 20c-1.5-.8-2.3-1.9-2.3-3.4 0-1.3.7-2.5 2-3.6 0 1.5.5 2.4 1.4 2.8.6-1 .9-1.8.7-3 1.2 1.3 1.6 2.5 1.2 3.9-.3 1.6-1.4 2.7-3 3.3Z"
              fill="currentColor"
              stroke="none"
            />
          </>
        )
      case "other":
        return (
          <>
            <path d="M12 3 21 20H3L12 3Z" />
            <path d="M12 9v5" />
            <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
          </>
        )
    }
  })()

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-hazard-accent={accent}
      data-hazard-icon={category}
      data-hazard-symbol={CATEGORY_SYMBOLS[category]}
      fill="none"
      focusable="false"
      style={
        {
          "--hazard-accent": accent,
          color: "var(--hazard-accent)",
          filter: glow ? `drop-shadow(0 0 2.5px ${accent}99)` : undefined,
        } as CSSProperties
      }
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.1"
    >
      {mark}
    </svg>
  )
}
