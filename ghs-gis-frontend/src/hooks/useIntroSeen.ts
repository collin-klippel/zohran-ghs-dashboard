import { useCallback, useState } from "react";

const STORAGE_KEY = "ghs-intro-seen";

/**
 * Whether to show the intro modal, remembered per browser.
 *
 * The flag is written in `dismiss` rather than in an effect on `open`, because
 * `main.tsx` renders under StrictMode and an effect would fire twice in dev —
 * and because reopening from the header is a look, not a reset, so `reopen`
 * deliberately leaves the stored flag alone.
 */
export function useIntroSeen(): {
  open: boolean;
  dismiss: () => void;
  reopen: () => void;
} {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== "1");

  const dismiss = useCallback(() => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const reopen = useCallback(() => setOpen(true), []);

  return { open, dismiss, reopen };
}
