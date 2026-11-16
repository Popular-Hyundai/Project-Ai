import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { S, measure } from "./state";
gsap.registerPlugin(ScrollTrigger, SplitText);
export function startMotion() {
  const lenis = new Lenis({
    anchors: false,
    autoRaf: false,
    smoothWheel: true,
  });
  const tick = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  lenis.on("scroll", ScrollTrigger.update);
  const progress = ScrollTrigger.create({
    start: 0,
    end: () => ScrollTrigger.maxScroll(window),
    onUpdate: (self) => {
      S.p = self.progress;
      document.documentElement.style.setProperty(
        "--parallax",
        Math.min(12, scrollY * 0.025) + "px",
      );
    },
  });
  const steps = Array.from(
    document.querySelectorAll<HTMLElement>(".steps li"),
  ).map((el) =>
    gsap.to(el, {
      "--fill": "100%",
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top 82%",
        end: "bottom 52%",
        scrub: true,
      },
    }),
  );
  let split: SplitText | undefined;
  let closed = false;
  document.fonts.ready.then(() => {
    if (closed) return;
    split = SplitText.create(".reveal", {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 100,
          stagger: 0.08,
          duration: 0.9,
          ease: "power4.out",
          scrollTrigger: { trigger: ".reveal", start: "top 92%" },
        }),
    });
    measure();
    ScrollTrigger.refresh();
  });
  const rises = gsap.utils
    .toArray<HTMLElement>(".science .body,#materials .body")
    .map((el) =>
      gsap.from(el, {
        y: 12,
        opacity: 0.94,
        duration: 0.9,
        ease: "power4.out",
        scrollTrigger: { trigger: el, start: "top 96%" },
      }),
    );
  let inView = true;
  function active() {
    S.active = !document.hidden && inView;
    if (S.active) {
      lenis.start();
      gsap.ticker.wake();
    } else {
      lenis.stop();
      gsap.ticker.sleep();
    }
    window.dispatchEvent(new Event("lumo-active"));
  }
  const observer = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    active();
  });
  observer.observe(document.querySelector("#canvas")!);
  document.addEventListener("visibilitychange", active);
  const cursor = document.querySelector<HTMLElement>(".cursor")!;
  const fine = matchMedia("(pointer:fine)");
  const buttons = Array.from(
    document.querySelectorAll<HTMLElement>(".cta,.navcta"),
  );
  function move(e: PointerEvent) {
    if (!fine.matches) return;
    S.pointerX = (e.clientX / innerWidth) * 2 - 1;
    S.pointerY = 1 - (e.clientY / innerHeight) * 2;
    let over = false;
    for (const el of buttons) {
      const r = el.getBoundingClientRect(),
        dx = e.clientX - r.left - r.width / 2,
        dy = e.clientY - r.top - r.height / 2;
      const near = Math.hypot(dx, dy) < 80;
      el.style.translate = near
        ? Math.max(-10, Math.min(10, dx * 0.14)) +
          "px " +
          Math.max(-10, Math.min(10, dy * 0.14)) +
          "px"
        : "";
      if (near) over = true;
    }
    const r = document.querySelector(".hero-ring")!.getBoundingClientRect();
    over ||=
      e.clientX > r.left &&
      e.clientX < r.right &&
      e.clientY > r.top &&
      e.clientY < r.bottom;
    cursor.style.display = over ? "block" : "none";
    cursor.style.left = e.clientX - 15 + "px";
    cursor.style.top = e.clientY - 15 + "px";
  }
  window.addEventListener("pointermove", move);
  return () => {
    closed = true;
    split?.revert();
    [...steps, ...rises].forEach((a) => {
      a.scrollTrigger?.kill();
      a.revert();
    });
    progress.kill();
    lenis.destroy();
    gsap.ticker.remove(tick);
    observer.disconnect();
    document.removeEventListener("visibilitychange", active);
    window.removeEventListener("pointermove", move);
    cursor.style.display = "none";
  };
}
