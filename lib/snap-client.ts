import "@/types/midtrans-snap";

/** Resolves once Midtrans Snap's script has loaded; gives up after 8 seconds. */
export function waitForSnap() {
  return new Promise<NonNullable<Window["snap"]>>(
    (resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        if (typeof window.snap?.pay === "function") {
          resolve(window.snap);
          return;
        }
        if (Date.now() - started > 8000) {
          reject(new Error("Payment is still loading. Please try again."));
          return;
        }
        window.setTimeout(tick, 80);
      };
      tick();
    },
  );
}
