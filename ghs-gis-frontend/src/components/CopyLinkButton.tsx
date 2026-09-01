import { useCallback, useEffect, useRef, useState } from "react";

/** Transient states of the button. */
const LABEL = {
  idle: "Copy link",
  copied: "Link copied",
  failed: "Copy failed",
} as const;

const RESET_MS = 1600;

export interface CopyLinkButtonProps {
  /** Overrides only the idle label; the copied and failed states are fixed. */
  label?: string;
}

/**
 * Copies the current URL, which carries the whole dashboard view — see
 * `hooks/useViewState.ts` — or, on a school page, that school. Putting the mode
 * in the URL rather than in a router is what lets one button serve both.
 */
export default function CopyLinkButton({ label }: CopyLinkButtonProps = {}) {
  const [state, setState] = useState<keyof typeof LABEL>("idle");
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(() => {
    const flash = (next: "copied" | "failed") => {
      setState(next);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), RESET_MS);
    };

    void (async () => {
      try {
        // `navigator.clipboard` is undefined outside a secure context and the
        // write can be denied inside one, so both land on the same fallback —
        // otherwise the button is a silent no-op and the rejection is unhandled.
        await navigator.clipboard.writeText(window.location.href);
        flash("copied");
      } catch {
        flash("failed");
      }
    })();
  }, []);

  return (
    <button className="button" onClick={copy}>
      {state === "idle" ? (label ?? LABEL.idle) : LABEL[state]}
    </button>
  );
}
