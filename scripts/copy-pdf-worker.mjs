// Copies the pdf.js worker into /public so it can be served as a static asset
// and referenced via GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs".
import { copyFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(root, "public");
const dest = join(destDir, "pdf.worker.min.mjs");

try {
  await access(src);
} catch {
  console.warn("[copy-pdf-worker] worker not found yet at", src, "- skipping (run after npm install).");
  process.exit(0);
}

await mkdir(destDir, { recursive: true });
await copyFile(src, dest);
console.log("[copy-pdf-worker] copied worker -> public/pdf.worker.min.mjs");
