// Generates test fixtures used by the browser test pass.
//   fixtures/digital.pdf  - 2 pages of real text (incl. a typo to fix)
//   fixtures/form.pdf      - an AcroForm with a text field + checkbox
//   fixtures/scanned.pdf   - vector-only page, NO text layer (simulates a scan)
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(dirname(fileURLToPath(import.meta.url))), "fixtures");
await mkdir(outDir, { recursive: true });

async function digital() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const p1 = doc.addPage([612, 792]);
  p1.drawText("ACME Health Network", { x: 72, y: 720, size: 20, font: bold });
  p1.drawText("Date Receipt: 3/18/26", { x: 72, y: 690, size: 12, font });
  p1.drawText("Guarantor Name: Steven Michael Gates", { x: 72, y: 650, size: 12, font });
  p1.drawText("Patient Name: Steven M. Gates", { x: 72, y: 632, size: 12, font });
  // The deliberate typo the hero test fixes: "quik" -> "quick"
  p1.drawText("The quik brown fox jumps over the lazy dog.", { x: 72, y: 590, size: 14, font });
  p1.drawText("Total Paid: $1,260.96", { x: 72, y: 550, size: 12, font: bold });
  p1.drawText("Thank you for your payment.", { x: 72, y: 520, size: 12, font });

  const p2 = doc.addPage([612, 792]);
  p2.drawText("Page Two", { x: 72, y: 720, size: 18, font: bold });
  p2.drawText("This is the second page of the document.", { x: 72, y: 690, size: 12, font });

  await writeFile(join(outDir, "digital.pdf"), await doc.save());
}

async function form() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText("Registration Form", { x: 72, y: 720, size: 18, font });
  page.drawText("Full name:", { x: 72, y: 670, size: 12, font });
  page.drawText("I agree to the terms", { x: 110, y: 620, size: 12, font });

  const f = doc.getForm();
  const tf = f.createTextField("fullName");
  tf.addToPage(page, { x: 160, y: 662, width: 260, height: 22 });
  const cb = f.createCheckBox("agree");
  cb.addToPage(page, { x: 80, y: 616, width: 18, height: 18 });

  await writeFile(join(outDir, "form.pdf"), await doc.save());
}

async function scanned() {
  // No text at all -> our detector flags it as scanned/non-editable.
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawRectangle({ x: 60, y: 600, width: 492, height: 140, borderWidth: 1.5, borderColor: rgb(0.3, 0.3, 0.3) });
  for (let i = 0; i < 6; i++) {
    const y = 700 - i * 18;
    page.drawLine({ start: { x: 80, y }, end: { x: 520, y }, thickness: 4, color: rgb(0.55, 0.55, 0.55) });
  }
  page.drawRectangle({ x: 80, y: 300, width: 180, height: 80, color: rgb(0.85, 0.85, 0.85) });
  await writeFile(join(outDir, "scanned.pdf"), await doc.save());
}

await digital();
await form();
await scanned();
console.log("Fixtures written to", outDir);
