import * as React from "react"
import { cn } from "@/lib/utils"

/** Marca de Hilo: carpeta con listón. Colores por token (primary, background). */
function BrandMark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true" className={cn("size-10 shrink-0", className)} {...props}>
      <rect x="32" y="32" width="960" height="960" rx="216" className="fill-primary" />
      <path
        d="M232 330a56 56 0 0 1 56-56h150l56 60h242a56 56 0 0 1 56 56v346a56 56 0 0 1-56 56H288a56 56 0 0 1-56-56z"
        className="fill-background"
      />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M582 730 L480 596 C436 538 440 444 512 444 C584 444 588 538 544 596" className="stroke-primary" strokeWidth="60" />
        <path d="M470 698 L560 575" className="stroke-background" strokeWidth="96" />
        <path d="M443 730 L560 575" className="stroke-primary" strokeWidth="60" />
      </g>
    </svg>
  )
}

type WordmarkProps = React.ComponentProps<"div"> & {
  /** Muestra "para EIRA Movimiento Rosa" debajo del nombre. */
  withEndorsement?: boolean
}

/** Wordmark "Hilo". Úsalo en la barra superior y la pantalla de inicio. */
function Wordmark({ className, withEndorsement = false, ...props }: WordmarkProps) {
  return (
    <div data-slot="wordmark" className={cn("flex items-center gap-sm", className)} {...props}>
      <BrandMark />
      <div className="flex flex-col">
        <span className="type-heading text-foreground">
          <span className="text-brand-text">Hilo</span>
        </span>
        {withEndorsement && <span className="type-caption text-muted-foreground">para EIRA Movimiento Rosa</span>}
      </div>
    </div>
  )
}

export { BrandMark, Wordmark }
