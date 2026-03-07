import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import * as path from "path";

const packageId = "questworlds";
const foundryHost = `${process.env.FOUNDRY_HOST_NAME ?? "localhost"}:${process.env.FOUNDRY_PORT ?? "30013"}`;

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    base: "./",
    publicDir: false,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      lib: {
        entry: path.resolve(__dirname, "module/questworlds.mjs"),
        name: packageId,
        formats: ["es"],
        fileName: packageId,
      },
      rollupOptions: {
        output: {
          manualChunks: undefined,
          entryFileNames: `${packageId}.js`,
        },
      },
    },
    server: {
      port: 30001,
      proxy: {
        "/socket.io": {
          target: `ws://${foundryHost}`,
          ws: true,
        },
      },
    },
    plugins: [
      viteStaticCopy({
        targets: [
          { src: "system.json", dest: "" },
          { src: "lang/**", dest: "lang" },
          { src: "templates/**", dest: "templates" },
          { src: "styles/**", dest: "styles" },
          { src: "assets/**", dest: "assets" },
        ],
      }),
    ],
  };
});
