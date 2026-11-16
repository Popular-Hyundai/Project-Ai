import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { preview, createServer } from "vite";
import { browser, executablePath } from "./browser.mjs";
import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";
import assert from "node:assert/strict";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
for (const task of ["build", "check:placeholders"]) {
  const run = spawnSync(
    process.execPath,
    [process.env.npm_execpath, "run", task],
    { stdio: "inherit" },
  );
  if (run.status !== 0) process.exit(run.status ?? 1);
}
const { filler } = await import("./placeholders.mjs");
const out = process.env.QA_DIR || "qa-output";
await fs.mkdir(out, { recursive: true });
const host = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const url = "http://127.0.0.1:" + host.httpServer.address().port;
const b = await browser(),
  failures = [],
  metrics = {
    frames: 0,
    minContrast: 99,
    cls: 0,
    maxDraws: 0,
    axe: 0,
    consoleErrors: [],
    failedRequests: [],
    backends: [],
    form: [],
    links: 0,
    focus: 0,
  };
const check = (condition, message) => {
  if (!condition && !failures.includes(message)) failures.push(message);
};
const files = await fs.readdir("dist/assets");
metrics.entryBytes = gzipSync(
  await fs.readFile(
    "dist/assets/" + files.find((f) => /^index-.*\.js$/.test(f)),
  ),
).length;
check(metrics.entryBytes < 150000, "entry budget");
async function inspectText(p) {
  const t = await p.evaluate(() =>
    [
      document.body.innerText,
      ...Array.from(
        document.querySelectorAll(
          "[title],[aria-label],article,[role=status],figcaption,[hidden],main *,footer *",
        ),
        (n) =>
          [
            n.getAttribute("title"),
            n.getAttribute("aria-label"),
            n.children.length ? "" : n.textContent,
          ].join(" "),
      ),
    ].join(" "),
  );
  check(!filler.test(t), "rendered filler");
}
const overlap = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
async function frame(p, label) {
  await p.waitForTimeout(180);
  await inspectText(p);
  const info = await p.evaluate(() => {
    const rect = (r) => ({ x: r.x, y: r.y, w: r.width, h: r.height });
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const lines = [];
    while (walker.nextNode()) {
      const n = walker.currentNode,
        el = n.parentElement;
      if (
        !el ||
        !n.textContent.trim() ||
        el.closest("[aria-hidden=true],script,style") ||
        getComputedStyle(el).visibility === "hidden"
      )
        continue;
      const sel = document.createRange();
      sel.selectNodeContents(n);
      const style = getComputedStyle(el);
      for (const r of sel.getClientRects()) {
        if (
          r.width &&
          r.height &&
          r.bottom > 0 &&
          r.top < innerHeight &&
          r.right > 0 &&
          r.left < innerWidth
        )
          lines.push({
            ...rect(r),
            rgb: style.color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number),
            txt: n.textContent.trim().slice(0, 32),
          });
      }
    }
    const stage = document
      .querySelector(".anatomy-panel")
      .getBoundingClientRect();
    return {
      lines,
      overflow: document.documentElement.scrollWidth > innerWidth,
      labels:
        Math.abs(stage.top) < 2 && stage.height <= innerHeight + 1
          ? Array.from(document.querySelectorAll(".labels article"), (el) => ({
              ...rect(el.getBoundingClientRect()),
              clip: el.scrollHeight > el.clientHeight,
            }))
          : [],
      h: innerHeight,
      w: innerWidth,
      cls: window.__cls,
      draws: window.lumo.draws,
      products: Array.from(document.querySelectorAll(".product"), (el) => {
        const r = el.getBoundingClientRect(),
          w = Math.min(r.width * 0.72, r.height * 1.12),
          h = Math.min(r.height * 0.65, w * 0.62);
        return {
          x: r.x + (r.width - w) / 2,
          y: r.y + (r.height - h) / 2,
          w,
          h,
        };
      }),
    };
  });
  check(!info.overflow, label + " horizontal overflow");
  for (const [i, r] of info.labels.entries()) {
    check(
      !r.clip &&
        r.x >= 0 &&
        r.y >= -1 &&
        r.y + r.h <= info.h + 1 &&
        r.x + r.w <= info.w + 1,
      label + " label bounds",
    );
    for (const o of info.labels.slice(i + 1))
      check(!overlap(r, o), label + " label collision");
  }
  for (const r of info.lines)
    for (const obj of info.products)
      if (overlap(r, obj)) check(false, label + " ring/text " + r.txt);
  await p.screenshot({
    path: out + "/" + label + ".jpg",
    type: "jpeg",
    quality: 70,
  });
  const css = await p.addStyleTag({
    content:
      "*,*::before,*::after{-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}",
  });
  const png = PNG.sync.read(await p.screenshot());
  await css.evaluate((n) => n.remove());
  const lum = (rgb) =>
    rgb
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  for (const t of info.lines) {
    const fg = lum(t.rgb);
    for (
      let y = Math.max(0, Math.ceil(t.y + 1));
      y < Math.min(info.h, t.y + t.h - 1);
      y += 4
    )
      for (
        let x = Math.max(0, Math.ceil(t.x + 1));
        x < Math.min(info.w, t.x + t.w - 1);
        x += 4
      ) {
        const at = (y * png.width + x) * 4,
          bg = lum([png.data[at], png.data[at + 1], png.data[at + 2]]);
        const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
        if (ratio < metrics.minContrast) {
          metrics.minContrast = ratio;
          metrics.tightest = [label, t.txt, x, y];
        }
        if (ratio < 4.5) check(false, label + " contrast " + t.txt);
      }
  }
  metrics.frames++;
  if (info.cls > metrics.cls) {
    metrics.cls = info.cls;
    metrics.clsFrame = label;
  }
  metrics.maxDraws = Math.max(metrics.maxDraws, info.draws);
}
function listen(p) {
  p.on("console", (m) => {
    if (m.type() === "error") metrics.consoleErrors.push(m.text());
  });
  p.on("pageerror", (e) => metrics.consoleErrors.push(e.message));
  p.on("requestfailed", (r) =>
    metrics.failedRequests.push([r.url(), r.failure()?.errorText]),
  );
}
try {
  for (const w of [375, 768, 1440])
    for (const mode of ["default", "poster", "reduced"]) {
      console.log("Inspecting", w, mode);
      const context = await b.newContext({
        viewport: { width: w, height: w === 375 ? 812 : 900 },
        reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
      });
      const p = await context.newPage();
      listen(p);
      await p.addInitScript(() => {
        window.__cls = 0;
        let start = 0,
          last = 0,
          total = 0;
        new PerformanceObserver((list) => {
          window.__lcp = list.getEntries().at(-1)?.element?.tagName;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            if (!e.hadRecentInput) {
              if (e.startTime - last > 1000 || e.startTime - start > 5000) {
                start = e.startTime;
                total = 0;
              }
              last = e.startTime;
              total += e.value;
              window.__cls = Math.max(window.__cls, total);
            }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await p.goto(url + (mode === "poster" ? "/?tier=poster" : ""));
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(600);
      check(
        (await p.evaluate(() => window.__lcp)) === "H1",
        "headline LCP " + w + " " + mode,
      );
      if (w === 375 && mode === "default") {
        check((await p.locator("canvas").count()) === 0, "mobile eager canvas");
        await p.mouse.click(3, 3);
      }
      await p.waitForTimeout(500);
      const positions = await p.evaluate(() => {
        const max = document.documentElement.scrollHeight - innerHeight,
          a = document.querySelector("#anatomy"),
          d = Math.max(0, a.offsetHeight - innerHeight);
        return [
          ...[0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1].map((v) => v * max),
          ...[0, 0.5, 1].map((v) => a.offsetTop + v * d),
        ];
      });
      for (const [i, pos] of positions.entries()) {
        await p.evaluate((y) => scrollTo(0, y), pos);
        await frame(p, w + "-" + mode + "-" + String(i).padStart(2, "0"));
      }
      const violations = (
        await new AxeBuilder({ page: p }).analyze()
      ).violations.filter((v) => ["serious", "critical"].includes(v.impact));
      metrics.axe += violations.length;
      for (const v of violations)
        check(false, "axe " + v.id + " " + v.nodes[0].target);
      for (const a of await p.locator("a[href]").all()) {
        const href = await a.getAttribute("href");
        check(
          href !== "#" && Boolean(await p.locator(href).count()),
          "invalid anchor " + href,
        );
        if ((await a.getAttribute("target")) === "_blank")
          check(
            (await a.getAttribute("rel")).includes("noopener"),
            "unsafe blank",
          );
        if (
          !(await a.isVisible()) ||
          (await a.getAttribute("class")) === "skip"
        )
          continue;
        await a.click();
        await p
          .waitForFunction(
            (hash) => {
              const r = document.querySelector(hash).getBoundingClientRect();
              return r.top < innerHeight && r.bottom > 0;
            },
            href,
            { timeout: 6000 },
          )
          .catch(() => {
            check(false, "anchor click " + w + " " + mode + " " + href);
          });
        metrics.links++;
      }
      await p.locator(".skip").focus();
      await p.keyboard.press("Enter");
      check(
        await p
          .locator("#main")
          .evaluate((el) => el === document.activeElement),
        "skip focus",
      );
      await p.keyboard.press("Tab");
      for (let i = 0; i < 10; i++) {
        const visible = await p.evaluate(() => {
          const el = document.activeElement;
          return (
            el.tagName === "BODY" ||
            getComputedStyle(el).outlineStyle !== "none"
          );
        });
        check(visible, "missing keyboard focus");
        metrics.focus++;
        await p.keyboard.press("Tab");
      }
      await p.getByRole("radio", { name: "Silver" }).focus();
      await p.keyboard.press("ArrowRight");
      check(
        (await p
          .getByRole("radio", { name: "Graphite" })
          .getAttribute("aria-checked")) === "true",
        "finish keyboard",
      );
      metrics.backends.push([
        w,
        mode,
        await p.evaluate(() => window.lumo.backend),
      ]);
      await context.close();
    }
  const p = await b.newPage();
  await p.goto(url);
  const submit = p.locator("form button");
  for (const [email, status] of [
    ["", "Enter a complete"],
    ["bad", "Enter a complete"],
    ["reader@lumo.test", "Form works. Nothing was saved."],
  ]) {
    await p.locator("#email").fill(email);
    await submit.click();
    assert((await p.locator("[role=status]").innerText()).includes(status));
    await inspectText(p);
    metrics.form.push(status);
  }
  for (const [tier, renderer] of [
    ["high", "webgpu"],
    ["mid", "webgl"],
    ["low", "webgpu"],
    ["poster", "webgl"],
  ]) {
    await p.goto(url + "/?tier=" + tier + "&renderer=" + renderer);
    await p.waitForTimeout(1800);
    const result = await p.evaluate(() => ({
      backend: window.lumo.backend,
      frames: window.lumo.frames,
      draws: window.lumo.draws,
    }));
    metrics.backends.push([tier, renderer, result]);
    if (["low", "poster"].includes(tier))
      check(result.frames === 0, "poster mounted");
    if (result.frames) {
      check(result.draws > 0 && result.draws < 100, "draw calls");
      const before = await p.screenshot();
      await p
        .locator("#canvas")
        .evaluate((el) => (el.style.visibility = "hidden"));
      const after = await p.screenshot();
      check(!before.equals(after), "blank canvas");
      await p.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          value: true,
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await p.waitForTimeout(200);
      const n = await p.evaluate(() => window.lumo.frames);
      await p.waitForTimeout(250);
      check(n === (await p.evaluate(() => window.lumo.frames)), "hidden loop");
    }
  }
  await p.close();
  process.env.VITE_WAITLIST_URL = "/qa-submit";
  const api = await createServer({
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  });
  await api.listen();
  try {
    const p = await b.newPage({ reducedMotion: "reduce" });
    let status = 500;
    await p.route("**/qa-submit", async (r) => {
      assert.deepEqual(r.request().postDataJSON(), {
        email: "reader@lumo.test",
      });
      await new Promise((r) => setTimeout(r, 180));
      await r.fulfill({ status, body: "{}" });
    });
    await p.goto("http://127.0.0.1:" + api.httpServer.address().port);
    await p.locator("#email").fill("reader@lumo.test");
    await p.locator("form button").click();
    await p.getByText("Sending your email…").waitFor();
    await inspectText(p);
    await p
      .getByText("Your email could not be submitted.", { exact: false })
      .waitFor();
    await inspectText(p);
    status = 200;
    await p.getByRole("button", { name: "Try again" }).click();
    await p.getByText("You’re on the launch waitlist.").waitFor();
    await inspectText(p);
    metrics.form.push("sending", "500", "retry", "success");
    await p.close();
  } finally {
    await api.close();
    delete process.env.VITE_WAITLIST_URL;
  }
  const chrome = await launch({
    chromePath: executablePath,
    chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const { lhr } = await lighthouse(url, {
      port: chrome.port,
      onlyCategories: ["performance"],
      logLevel: "error",
    });
    metrics.lighthouse = {
      score: lhr.categories.performance.score * 100,
      lcp: lhr.audits["largest-contentful-paint"].numericValue,
      cls: lhr.audits["cumulative-layout-shift"].numericValue,
    };
    check(
      metrics.lighthouse.score >= 85 &&
        metrics.lighthouse.lcp < 2500 &&
        metrics.lighthouse.cls < 0.1,
      "Lighthouse budget",
    );
  } finally {
    await chrome.kill();
  }
  check(metrics.cls < 0.1, "CLS budget");
  check(metrics.consoleErrors.length === 0, "console errors");
  check(metrics.failedRequests.length === 0, "failed requests");
} catch (e) {
  failures.push(String(e.stack || e));
} finally {
  await b.close();
  await host.close();
  await fs.writeFile(
    out + "/results.json",
    JSON.stringify({ metrics, failures }, null, 2),
  );
  console.log(JSON.stringify({ metrics, failures }, null, 2));
  // Lighthouse can keep a telemetry port alive after Chrome closes.
  process.exit(failures.length ? 1 : 0);
}
