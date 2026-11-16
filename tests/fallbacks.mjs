import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { preview } from "vite";
import { executablePath } from "./browser.mjs";
const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const url =
  "http://127.0.0.1:" + server.httpServer.address().port + "/?tier=high";
try {
  for (const software of [false, true]) {
    const b = await chromium.launch({
      executablePath,
      args: software
        ? [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
          ]
        : [],
    });
    try {
      const page = await b.newPage();
      await page.addInitScript(() =>
        Object.defineProperty(navigator, "gpu", { value: undefined }),
      );
      await page.goto(url);
      const gpu = await page.evaluate(() => {
        const gl = document.createElement("canvas").getContext("webgl2");
        if (!gl) return "No WebGL2";
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        return ext
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : "Unknown GPU";
      });
      if (software) {
        assert.match(gpu, /swiftshader|llvmpipe|software|No WebGL2/i);
        await page.waitForTimeout(800);
        assert.equal(await page.locator("#canvas canvas").count(), 0);
      } else if (!/swiftshader|llvmpipe|software|No WebGL2/i.test(gpu)) {
        await page.waitForFunction(() => window.lumo.backend === "webgl2");
        await page
          .locator("#canvas")
          .evaluate((n) => (n.style.transform = "translateY(110vh)"));
        await page.waitForFunction(() => window.lumo.active === false);
        await page.waitForTimeout(150);
        const count = await page.evaluate(() => window.lumo.frames);
        await page.waitForTimeout(300);
        assert.equal(await page.evaluate(() => window.lumo.frames), count);
        await page
          .locator("#canvas")
          .evaluate((n) => (n.style.transform = "none"));
        await page.waitForFunction((n) => window.lumo.frames > n, count);
      }
      console.log(
        JSON.stringify({
          gpu,
          software,
          backend: await page.evaluate(() => window.lumo.backend),
        }),
      );
    } finally {
      await b.close();
    }
  }
} finally {
  await server.close();
}
