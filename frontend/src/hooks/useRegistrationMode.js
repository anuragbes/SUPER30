import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { retryWithBackoff } from "@/utils/retryWithBackoff";

// The three states a mode lookup can be in. There is deliberately no
// fallback value baked into any of them -- "error" carries no guessed
// formMode, only LOADING -> SUCCESS transitions ever produce one.
export const REGISTRATION_MODE_STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

/**
 * Determines which registration mode ("junior" | "senior") is currently
 * active, with a bounded retry-with-backoff on transient failures, and
 * cancels any in-flight attempt (both the retry loop and the underlying
 * request) on unmount so no state update or network call outlives the
 * component.
 *
 * Never resolves to a guessed mode: on failure (including retry
 * exhaustion), `status` is "error" and `formMode` stays null. Callers must
 * not render either registration form in that state.
 */
export function useRegistrationMode(backendURL) {
  const [status, setStatus] = useState(REGISTRATION_MODE_STATUS.LOADING);
  const [formMode, setFormMode] = useState(null);

  const cancelledRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Mirrors of the two state values above, kept in sync via the effect
  // below, so the visibility/focus listener (added once) can always read
  // the current status/mode without needing to be re-attached on every
  // state change.
  const statusRef = useRef(status);
  const formModeRef = useRef(formMode);
  useEffect(() => {
    statusRef.current = status;
    formModeRef.current = formMode;
  }, [status, formMode]);

  const fetchFormMode = useCallback(() => {
    // Abort any attempt already in flight (e.g. a rapid double-click on
    // Retry) before starting a new one.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    cancelledRef.current = false;

    setStatus(REGISTRATION_MODE_STATUS.LOADING);

    return retryWithBackoff(
      () => axios.get(`${backendURL}/api/admin/exam-settings`, { signal: controller.signal }),
      { isCancelled: () => cancelledRef.current },
    )
      .then((res) => {
        if (cancelledRef.current) return;
        const mode = res.data?.formMode;
        if (mode !== "junior" && mode !== "senior") {
          // Settings responded, but formMode is missing/invalid. The
          // backend's own registration gate fails closed on exactly this
          // case (see registerStudent) -- the frontend must too, rather
          // than guessing.
          setStatus(REGISTRATION_MODE_STATUS.ERROR);
          return;
        }
        setFormMode(mode);
        setStatus(REGISTRATION_MODE_STATUS.SUCCESS);
      })
      .catch((error) => {
        if (cancelledRef.current) return;
        console.error("Failed to determine active registration mode:", error);
        setStatus(REGISTRATION_MODE_STATUS.ERROR);
      });
  }, [backendURL]);

  useEffect(() => {
    fetchFormMode();
    return () => {
      cancelledRef.current = true;
      abortControllerRef.current?.abort();
    };
  }, [fetchFormMode]);

  // Reliability: if an admin changes the active mode while a user already
  // has this page open, a one-time fetch-on-mount would leave that user on
  // stale configuration for as long as the tab stays open. Re-check when
  // the tab/window regains visibility or focus -- the same moment a user
  // returns to a tab they stepped away from, which is exactly the gap the
  // original incident fell through.
  //
  // While the mode is still loading or previously failed, a regained-focus
  // check simply resumes the existing (visible) fetch -- nothing is
  // rendered yet, so there's nothing to disrupt. Once a mode has loaded
  // successfully, a regained-focus check instead runs silently in the
  // background: it never flips `status` back to "loading" (which would
  // hide the form and interrupt anything the user has already typed), and
  // only surfaces a change via a toast, never by silently swapping
  // `formMode`/the rendered form out from under an in-progress fill.
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === "hidden") return;

      if (statusRef.current !== REGISTRATION_MODE_STATUS.SUCCESS) {
        fetchFormMode();
        return;
      }

      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      axios
        .get(`${backendURL}/api/admin/exam-settings`)
        .then((res) => {
          const latestMode = res.data?.formMode;
          const isKnownMode = latestMode === "junior" || latestMode === "senior";
          if (isKnownMode && latestMode !== formModeRef.current) {
            toast.warning("The active registration has changed since this page loaded.", {
              duration: Infinity,
              action: {
                label: "Refresh",
                onClick: () => window.location.reload(),
              },
            });
          }
        })
        // Best-effort: a failed background revalidation must not disturb an
        // already-successfully-loaded form. The next focus/visibility event
        // (or the user's own actions) will simply try again.
        .catch((error) => {
          console.error("Background registration-mode revalidation failed:", error);
        })
        .finally(() => {
          isCheckingRef.current = false;
        });
    };

    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [backendURL, fetchFormMode]);

  return { status, formMode, retry: fetchFormMode };
}
