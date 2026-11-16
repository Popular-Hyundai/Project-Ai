export const ids = [
  "top",
  "problem",
  "anatomy",
  "science",
  "materials",
  "steps",
  "waitlist",
  "footer",
] as const;
export const S = {
  pointerX: 0,
  pointerY: 0,
  p: 0,
  pinSpan: 0,
  stops: [] as number[],
  finish: 0,
  active: true,
  frames: 0,
  draws: 0,
  backend: "poster",
  anchors: [] as { x: number; y: number }[],
};
export function measure() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  S.pinSpan =
    Math.max(
      1,
      document.getElementById("anatomy")!.offsetHeight - innerHeight,
    ) / max;
  S.stops = ids.map((id) =>
    Math.min(
      1,
      (document.getElementById(id)!.getBoundingClientRect().top + scrollY) /
        max,
    ),
  );
}
export function sectionAt(p: number) {
  let i = S.stops.findLastIndex((n) => n <= p);
  i = Math.max(0, i);
  return (
    i +
    Math.min(
      0.999,
      Math.max(0, (p - S.stops[i]) / ((S.stops[i + 1] ?? 1) - S.stops[i] || 1)),
    )
  );
}
declare global {
  interface Window {
    lumo: typeof S;
  }
}
if (typeof window !== "undefined") window.lumo = S;
