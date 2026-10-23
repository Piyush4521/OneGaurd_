import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    prerender: {
      enabled: true,
      crawl: true,
      routes: ["/", "/alerts", "/usage", "/settings", "/privacy", "/terms"],
    },
  },
});

