export const DESIGNER_CHAT_STICKY_THRESHOLD_PX = 200;

type ScrollMetrics = Pick<
  HTMLElement,
  "scrollTop" | "scrollHeight" | "clientHeight"
>;

export function distanceFromBottom(el: ScrollMetrics): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
}

export function isNearBottom(
  el: ScrollMetrics,
  thresholdPx: number = DESIGNER_CHAT_STICKY_THRESHOLD_PX,
): boolean {
  return distanceFromBottom(el) <= thresholdPx;
}
