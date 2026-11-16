import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Hero, Story, Footer } from "./sections/Story";
import { S, measure } from "./state";
import "./style.css";
const Scene = lazy(() => import("./scene/Scene"));
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function App() {
  const [tier, setTier] = useState("poster");
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let dispose = () => {};
    let cancelled = false;
    measure();
    document.fonts.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    async function setup() {
      if (reduced.matches) return;
      if (cancelled) return;
      const query = new URLSearchParams(location.search),
        override = query.get("tier");
      if (override === "poster" || override === "low") return;
      const canvas = document.createElement("canvas"),
        ctx = canvas.getContext("webgl2");
      if (!ctx) return;
      const ext = ctx.getExtension("WEBGL_debug_renderer_info");
      const device = ext
        ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : "";
      if (/swiftshader|llvmpipe|software|basic render/i.test(device)) {
        ctx.getExtension("WEBGL_lose_context")?.loseContext();
        return;
      }
      const { getGPUTier } = await import("detect-gpu");
      const gpu = await getGPUTier({
        glContext: ctx,
        benchmarksURL: "/gpu-benchmarks",
      });
      ctx.getExtension("WEBGL_lose_context")?.loseContext();
      const level =
        override === "high" || override === "mid"
          ? override
          : gpu.tier >= 3
            ? "high"
            : gpu.tier === 2
              ? "mid"
              : "poster";
      if (!cancelled) setTier(level);
    }
    let ready = false;
    const boot = () => {
      if (!ready) {
        ready = true;
        void setup().catch(() => setTier("poster"));
      }
    };
    if (!reduced.matches) {
      requestAnimationFrame(() =>
        import("./motion").then((mod) => {
          if (!cancelled) dispose = mod.startMotion();
        }),
      );
    }
    const interaction = boot;
    const events = ["pointerdown", "keydown", "touchstart", "wheel"];
    if (innerWidth < 720)
      events.forEach((e) =>
        window.addEventListener(e, interaction, { once: true, passive: true }),
      );
    else requestAnimationFrame(() => requestAnimationFrame(boot));
    const change = () => location.reload();
    reduced.addEventListener("change", change);
    return () => {
      cancelled = true;
      dispose();
      observer.disconnect();
      window.removeEventListener("resize", measure);
      reduced.removeEventListener("change", change);
      events.forEach((e) => window.removeEventListener(e, interaction));
    };
  }, []);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div id="canvas" aria-hidden="true">
        {tier !== "poster" && (
          <Fallback>
            <Suspense fallback={null}>
              <Scene tier={tier} />
            </Suspense>
          </Fallback>
        )}
      </div>
      <main id="main" tabIndex={-1}>
        <Hero />
        <Story />
      </main>
      <Footer />
      <div className="cursor" aria-hidden="true" />
    </>
  );
}
if (!import.meta.env.SSR) {
  const root = document.getElementById("root")!;
  if (root.hasChildNodes()) hydrateRoot(root, <App />);
  else createRoot(root).render(<App />);
}
