import { useEffect, useRef, useState } from "react";
import { content as c } from "../content";
import { S } from "../state";
export function Arrow({ down = false }: { down?: boolean }) {
  return (
    <span aria-hidden="true" className={down ? "arrow down" : "arrow"}>
      ↗
    </span>
  );
}
export function CTA() {
  return (
    <a className="cta" href="#waitlist">
      Join the waitlist <Arrow />
    </a>
  );
}
export function Wordmark() {
  return (
    <span className="wordmark">
      <i aria-hidden="true" />
      {c.brand}
    </span>
  );
}
export function Product({
  name,
  finish = "silver",
}: {
  name: string;
  finish?: string;
}) {
  return (
    <div className={"product " + name} data-product={name} aria-hidden="true">
      <div className="orbit" />
      <div
        className="poster"
        style={{ borderImageSource: "url(/" + finish + ".webp)" }}
      />
    </div>
  );
}
export function Hero() {
  return (
    <section id="top" className="hero">
      <header>
        <a href="#top" aria-label={c.brand + ", back to top"}>
          <Wordmark />
        </a>
        <nav aria-label="Primary">
          <a href="#anatomy">Anatomy</a>
          <a href="#materials">Finishes</a>
          <a className="navcta" href="#waitlist">
            Join the waitlist <Arrow />
          </a>
        </nav>
      </header>
      <div className="hero-main">
        <div className="hero-copy">
          <p className="kicker">
            <i />
            Sleep &amp; recovery
          </p>
          <h1>
            {c.headline[0]}
            <br />
            <em>{c.headline[1]}</em>
          </h1>
          <p className="intro">{c.description}</p>
          <CTA />
        </div>
        <figure>
          <Product name="hero-ring" />
          <figcaption>
            <i />
            {c.brand} <b>/</b> {c.finishes[0].toUpperCase()}
          </figcaption>
        </figure>
      </div>
      <div className="hero-base">
        <a href="#problem">
          <span aria-hidden="true">↓</span> Scroll to explore
        </a>
        <span className="skyline" aria-hidden="true">
          ✧
        </span>
      </div>
    </section>
  );
}
function Anatomy() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current!;
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    let frame = 0;
    function place() {
      const stage = box.getBoundingClientRect();
      if (stage.bottom > 0 && stage.top < innerHeight) {
        const product = box.querySelector(".product")!.getBoundingClientRect();
        const cards = Array.from(box.querySelectorAll<HTMLElement>("article"));
        const paths = box.querySelectorAll("path");
        const narrow = innerWidth < 720;
        const anchors = cards.map((_, i) =>
          document.documentElement.classList.contains("live3d") &&
          S.anchors.length === 3
            ? S.anchors[i]
            : {
                x: product.left + product.width * (0.51 + i * 0.045),
                y: product.top + product.height * (0.31 + 0.16 * i),
              },
        );
        const sorted = anchors
          .map((a, i) => ({ ...a, i }))
          .sort((a, b) => a.y - b.y);
        const gap = Math.max(...cards.map((el) => el.offsetHeight)) + 18;
        const low =
            box.querySelector("h2")!.getBoundingClientRect().bottom -
            stage.top +
            18,
          high = stage.height - 24;
        let prev = low - gap;
        sorted.forEach((a, k) => {
          const el = cards[a.i];
          if (!narrow) {
            const y = Math.min(
              high - (2 - k) * gap - el.offsetHeight,
              Math.max(prev + gap, a.y - stage.top - el.offsetHeight / 2, low),
            );
            el.style.transform = "translateY(" + y + "px)";
            prev = y;
          }
          const r = el.getBoundingClientRect();
          const x = a.x - stage.left,
            y = a.y - stage.top,
            end = r.left - stage.left - 12,
            ey = r.top - stage.top + 12;
          paths[a.i].setAttribute(
            "d",
            "M " + x + " " + y + " L " + (end - 34) + " " + ey + " H " + end,
          );
        });
      }
      frame = requestAnimationFrame(place);
    }
    place();
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <section id="anatomy">
      <div className="anatomy-panel" ref={ref}>
        <p className="kicker">Anatomy</p>
        <h2>Inside the ring.</h2>
        <Product name="parts" finish="exploded" />
        <svg className="leaders" aria-hidden="true">
          {c.layers.map(([n]) => (
            <path key={n} />
          ))}
        </svg>
        <div className="labels">
          {c.layers.map(([n, d]) => (
            <article key={n}>
              <h3>{n}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
function Materials() {
  const [index, set] = useState(0);
  function pick(i: number) {
    S.finish = i;
    set(i);
  }
  return (
    <section id="materials" className="split">
      <div>
        <p className="kicker">Materials</p>
        <h2>In your finish.</h2>
        <p className="body" aria-live="polite">
          {c.finishDescriptions[index]}
        </p>
        <div className="swatches" role="radiogroup" aria-label="Ring finish">
          {c.finishes.map((name, i) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={i === index}
              tabIndex={i === index ? 0 : -1}
              onClick={() => pick(i)}
              onKeyDown={(e) => {
                if (
                  ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  const next =
                    (i +
                      (["ArrowRight", "ArrowDown"].includes(e.key) ? 1 : 2)) %
                    3;
                  pick(next);
                  (
                    e.currentTarget.parentElement!.children[next] as HTMLElement
                  ).focus();
                }
              }}
            >
              <i className={"swatch s" + i} />
              {name}
            </button>
          ))}
        </div>
      </div>
      <Product name="finish" finish={c.finishes[index].toLowerCase()} />
    </section>
  );
}
function Form() {
  const [state, set] = useState("idle");
  const ref = useRef<HTMLInputElement>(null);
  const url = import.meta.env.VITE_WAITLIST_URL;
  const message: Record<string, string> = {
    idle: "",
    invalid: "Enter a complete email address.",
    sending: "Sending your email…",
    success: "You’re on the launch waitlist.",
    demo: c.demo,
    error: "Your email could not be submitted. Please try again.",
  };
  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const field = ref.current!;
        if (
          !field.validity.valid ||
          !/^\S+@\S+\.\S+$/.test(field.value.trim())
        ) {
          set("invalid");
          field.focus();
          return;
        }
        if (!url) {
          set("demo");
          return;
        }
        set("sending");
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: field.value.trim() }),
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) throw Error();
          set("success");
        } catch {
          set("error");
        }
      }}
    >
      <label htmlFor="email">Email address</label>
      <div className="field">
        <input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          ref={ref}
          aria-invalid={state === "invalid"}
          aria-describedby="form-note form-status"
          onChange={() => set("idle")}
          disabled={state === "sending"}
        />
        <button
          className="cta"
          disabled={state === "sending" || state === "success"}
        >
          {state === "error"
            ? "Try again"
            : state === "sending"
              ? "Sending…"
              : "Join the waitlist"}{" "}
          <Arrow />
        </button>
      </div>
      <p id="form-note">
        {url
          ? "One launch email. No newsletter."
          : "Demo form. Your email stays in this browser tab."}
      </p>
      <p id="form-status" role="status" aria-live="polite">
        {message[state]}
      </p>
    </form>
  );
}
export function Story() {
  return (
    <>
      <section id="problem" className="problem split">
        <div>
          <p className="kicker">The problem</p>
          <h2 className="reveal">
            A dashboard at dawn.
            <br />
            Scores to compare.
            <br />
            Charts to untangle.
            <br />
            <em>Before your first coffee.</em>
          </h2>
        </div>
        <Product name="recede" />
      </section>
      <Anatomy />
      <section id="science" className="science">
        <p className="kicker">Sleep science</p>
        <h2>The shape of a night.</h2>
        <div className="wave" data-product="science">
          <div className="stages">
            {["Awake", "REM", "Light", "Deep"].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <svg
            viewBox="0 0 800 160"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 20 C50 20 45 82 90 82 S135 145 170 145 S210 52 260 52 S310 110 352 110 S395 140 430 140 S475 40 520 40 S567 93 610 93 S660 45 700 45 S750 22 800 22" />
          </svg>
        </div>
        <p className="body">{c.science}</p>
      </section>
      <Materials />
      <section id="steps" className="steps">
        <div>
          <p className="kicker">How it works</p>
          <h2>
            From dusk
            <br />
            to daylight.
          </h2>
        </div>
        <ol>
          {c.steps.map(([t, d], i) => (
            <li key={t}>
              <small>0{i + 1}</small>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section id="waitlist" className="waitlist">
        <Product name="settle" />
        <p className="kicker">Launch waitlist</p>
        <h2>Meet your night.</h2>
        <p>{"Hear " + c.launch + "."}</p>
        <Form />
      </section>
    </>
  );
}
export function Footer() {
  return (
    <footer id="footer">
      <div className="footer-nav">
        <Wordmark />
        <nav aria-label="Footer">
          <a href="#top">Back to top ↑</a>
          <a href="#waitlist">Waitlist</a>
          <a href="#privacy">Privacy</a>
        </nav>
      </div>
      <div id="privacy">
        <h2>Privacy</h2>
        <p>
          {import.meta.env.VITE_WAITLIST_URL ? c.privacy : c.privacyDemo}{" "}
          <span>Privacy note pending legal review.</span>
        </p>
      </div>
      <div className="legal">
        <span>
          © {c.year} {c.company}
        </span>
        <span>{c.fictional}</span>
        {c.address && <span>{c.address}</span>}
        {c.email && <span>{c.email}</span>}
      </div>
    </footer>
  );
}
