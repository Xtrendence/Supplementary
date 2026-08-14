import * as React from "react";

/** Re-renders once a second so "time since" counters stay live. Pass the
 *  screen's focus state so the interval stops while it isn't on screen. */
export function useSecondTick(enabled = true): void {
  const [, tick] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    if (!enabled) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled]);
}
