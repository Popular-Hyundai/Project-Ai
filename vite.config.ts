import { defineConfig } from "vite";
import { content } from "./src/content.ts";
// An explicit origin makes social artwork portable across deployments.
export default defineConfig({
  plugins: [
    {
      name: "lumo-metadata",
      transformIndexHtml(html) {
        const title = content.brand + " — " + content.title;
        return {
          html: html.replace("<title></title>", "<title>" + title + "</title>"),
          tags: [
            {
              tag: "meta",
              attrs: { name: "description", content: content.description },
            },
            ...Object.entries({
              title,
              description: content.description,
              type: "website",
              image: new URL(
                "/social.jpg",
                process.env.SITE_ORIGIN ||
                  "https://lumo-ring-night.decentwhale32.chatgpt.site",
              ).href,
            }).map(([key, value]) => ({
              tag: "meta",
              attrs: { property: "og:" + key, content: value },
            })),
          ],
        };
      },
    },
  ],
  build: { chunkSizeWarningLimit: 1700 },
});

