import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-tooltip'],
        },
      },
    },
  },
  server: {
    host: "localhost",
    port: 3000,
    strictPort: false,
    open: true, // Automatically open browser
    hmr: { overlay: false },
    watch: {
      usePolling: false,
    },
  },
});
