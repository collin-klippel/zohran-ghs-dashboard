import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface InfoTipProps {
  /** What is being defined; announced as "About <label>". */
  label: string;
  text: string;
}

/** Must match `.infotip__bubble`'s width — the clamp below does the math in JS. */
const WIDTH = 260;
/** Keeps the bubble off the window edges. */
const MARGIN = 8;
/** Space between the icon and the bubble. */
const GAP = 6;
/** Room a three-line definition needs; below this the bubble flips above the icon. */
const ROOM_BELOW = 130;

/** Fixed coordinates, anchored from whichever edge the bubble opens away from. */
interface Placement {
  left: number;
  top?: number;
  bottom?: number;
}

/**
 * A definition attached to a label — the "i" next to a field name.
 *
 * The bubble is `position: fixed` in a portal rather than absolutely positioned
 * in place: the sidebar it lives in is a scroll container, so an in-flow bubble
 * would be clipped by the panel's edges on the fields near the bottom. The cost
 * of being detached from the flow is that scrolling has to close it.
 */
export default function InfoTip({ label, text }: InfoTipProps) {
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const show = useCallback(() => {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(MARGIN, rect.left + rect.width / 2 - WIDTH / 2),
      Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN),
    );
    setPlacement(
      window.innerHeight - rect.bottom > ROOM_BELOW
        ? { left, top: rect.bottom + GAP }
        : { left, bottom: window.innerHeight - rect.top + GAP },
    );
  }, []);

  const hide = useCallback(() => setPlacement(null), []);

  useEffect(() => {
    if (!placement) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    // Capture, because the scroll happens on the panel rather than the window.
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [placement, hide]);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        className="infotip"
        aria-label={`About ${label}`}
        aria-describedby={placement ? id : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        // The icon sits inside a <summary> in the group headers, where a bare
        // click would collapse the group out from under the definition.
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        i
      </button>
      {placement &&
        createPortal(
          <span id={id} role="tooltip" className="infotip__bubble" style={placement}>
            {text}
          </span>,
          document.body,
        )}
    </>
  );
}
