// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      // Vite 8/Rolldown can drop or initialize shared bindings out of order in
      // code-split TanStack route chunks. The /agentes production chunk then
      // calls an undefined minified import ("l is not a function").
      rolldownOptions: {
        treeshake: false,
        experimental: {
          // Rolldown 1.1.0's lazy barrel optimization can emit invalid
          // initialization order for TanStack's split route plus the large
          // Lucide/Radix re-export graphs used by /agentes.
          lazyBarrel: false,
        },
      },
    },
  },
});
