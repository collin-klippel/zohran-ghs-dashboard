import { useCallback, useEffect, useRef } from "react";

export interface IntroModalProps {
  open: boolean;
  /** Called once the dialog has actually closed, however it was dismissed. */
  onClose: () => void;
  schoolCount: number;
}

/**
 * What this dashboard is, shown on a visitor's first open.
 *
 * The audience is campaign staff rather than GIS people, and the three-pane
 * layout explains none of itself, so the tool states its purpose once before
 * getting out of the way.
 *
 * This is a native `<dialog>` opened with `showModal()`, which is what supplies
 * the focus trap, Escape-to-close, `aria-modal`, the inert background, and
 * top-layer stacking — none of which exist elsewhere in this app. Every
 * dismissal route therefore funnels through the element's own `close` event, so
 * React state can't drift from what the browser is showing.
 */
export default function IntroModal({ open, onClose, schoolCount }: IntroModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus is moved by hand rather than with `autoFocus`, which React turns
      // into a `.focus()` call at mount — too early, since the dialog isn't
      // shown yet and nothing inside a closed one is focusable. Without this,
      // `showModal` falls back to the first focusable element, which is the
      // close button.
      primary.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close the element and let its `close` event report back, rather than
  // calling `onClose` here — Escape and a backdrop click can't route through a
  // handler, and one path for all three keeps them consistent.
  const close = useCallback(() => ref.current?.close(), []);

  return (
    <dialog
      ref={ref}
      className="modal"
      closedby="any"
      aria-labelledby="intro-title"
      onClose={onClose}
    >
      <div className="modal__header">
        <div>
          <h2 className="modal__title" id="intro-title">
            Green Healthy Schools
          </h2>
          <p className="modal__subtitle">NYC school prioritization &amp; canvassing map</p>
        </div>
        <div className="header__spacer" />
        <button className="button button--ghost" onClick={close} aria-label="Close">
          ×
        </button>
      </div>

      <div className="modal__body">
        <p className="modal__lede">
          Which NYC schools are prioritized for renovation under the Green Healthy Schools
          plan, and where to canvass. All {schoolCount.toLocaleString()} schools, colored and
          ranked by the metric you pick.
        </p>

        <ul className="modal__list">
          <li>
            <strong>Map</strong> — click a school for its full record; hover for a quick
            tooltip.
          </li>
          <li>
            <strong>Filters</strong> — search by name, filter by facets and numeric ranges.
            Counts stay live.
          </li>
          <li>
            <strong>Priority ranking</strong> — the top 100 by your selected metric,
            following your filters and, optionally, the current map view.
          </li>
          <li>
            <strong>Overlays</strong> — add a context layer (Disadvantaged Communities,
            Zohran first-round share) or district boundaries.
          </li>
          <li>
            <strong>Export</strong> — download the filtered set as CSV, for spreadsheets and
            VAN.
          </li>
          <li>
            <strong>Copy link</strong> — the metric, filters, overlays, selection, and camera
            all live in the URL, so a link reproduces exactly what's on your screen.
          </li>
        </ul>
      </div>

      <div className="modal__footer">
        <button ref={primary} className="button" onClick={close}>
          Explore the map
        </button>
      </div>
    </dialog>
  );
}
