import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import fs from "node:fs/promises";
const server = await createServer({
  mode: "production",
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { App } = await server.ssrLoadModule("/src/main.tsx");
  const file = "dist/index.html";
  const original = await fs.readFile(file, "utf8");
  await fs.writeFile(
    file,
    original.replace(
      '<div id="root"></div>',
      '<div id="root">' + renderToString(createElement(App)) + "</div>",
    ),
  );
} finally {
  await server.close();
}
