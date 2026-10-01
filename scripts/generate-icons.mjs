#!/usr/bin/env node
/**
 * scripts/generate-icons.mjs
 * Generates all PWA icon variants from public/brand/swepy-app-icon-1024.png
 */

import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SRC = path.join(root, "public", "brand", "swepy-app-icon-1024.png");

async function main() {
  console.log("📦 Generating icons from", SRC);

  // ── A. Rounded versions (keep transparent corners) ──

  // icon-192.png
  await sharp(SRC)
    .resize(192, 192, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(root, "public", "icons", "icon-192.png"));
  console.log("  ✓ icon-192.png");

  // icon-512.png
  await sharp(SRC)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(root, "public", "icons", "icon-512.png"));
  console.log("  ✓ icon-512.png");

  // src/app/icon.png (512x512, Next file convention)
  await sharp(SRC)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(root, "src", "app", "icon.png"));
  console.log("  ✓ src/app/icon.png");

  // favicon.ico — create 16, 32, 48 px PNGs then bundle as ICO
  const sizes = [16, 32, 48];
  const icoImages = [];
  for (const s of sizes) {
    const buf = await sharp(SRC)
      .resize(s, s, { kernel: sharp.kernel.lanczos3 })
      .ensureAlpha()
      .png()
      .toBuffer();
    icoImages.push({ size: s, buffer: buf });
  }
  const icoBuffer = buildIco(icoImages);
  fs.writeFileSync(path.join(root, "src", "app", "favicon.ico"), icoBuffer);
  console.log("  ✓ src/app/favicon.ico");

  // ── B. Square, fully opaque (iOS) ──

  // Flatten onto solid #B3225A, remove alpha
  const flattenedBuf = await sharp(SRC)
    .flatten({ background: { r: 179, g: 34, b: 90 } })
    .removeAlpha()
    .png()
    .toBuffer();

  // apple-icon.png (180x180)
  await sharp(flattenedBuf)
    .resize(180, 180, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(root, "src", "app", "apple-icon.png"));
  console.log("  ✓ src/app/apple-icon.png");

  // icon-square-1024.png (flattened, 1024x1024)
  await sharp(flattenedBuf)
    .png()
    .toFile(path.join(root, "public", "icons", "icon-square-1024.png"));
  console.log("  ✓ icon-square-1024.png");

  // ── C. Maskable versions (Android safe zone) ──

  // Scale the flattened artwork to 70% of canvas, centered on #B3225A
  for (const s of [192, 512]) {
    const artworkSize = Math.round(s * 0.7);
    const artwork = await sharp(flattenedBuf)
      .resize(artworkSize, artworkSize, { kernel: sharp.kernel.lanczos3 })
      .removeAlpha()
      .png()
      .toBuffer();

    // Create #B3225A canvas
    const canvas = sharp({
      create: {
        width: s,
        height: s,
        channels: 3,
        background: { r: 179, g: 34, b: 90 },
      },
    }).png();

    const offset = Math.round((s - artworkSize) / 2);

    await canvas
      .composite([{ input: artwork, left: offset, top: offset }])
      .png()
      .toFile(path.join(root, "public", "icons", `maskable-${s}.png`));
    console.log(`  ✓ maskable-${s}.png`);
  }

  // ── D. Open Graph image ──

  // 1200x630 white bg, original rounded PNG centered at 360px tall
  const ogArtworkHeight = 360;
  const originalMeta = await sharp(SRC).metadata();
  const aspectRatio = originalMeta.width / originalMeta.height;
  const ogArtworkWidth = Math.round(ogArtworkHeight * aspectRatio);

  const ogArtwork = await sharp(SRC)
    .resize(ogArtworkWidth, ogArtworkHeight, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const ogWidth = 1200;
  const ogHeight = 630;
  await sharp({
    create: {
      width: ogWidth,
      height: ogHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .composite([
      {
        input: ogArtwork,
        left: Math.round((ogWidth - ogArtworkWidth) / 2),
        top: Math.round((ogHeight - ogArtworkHeight) / 2),
      },
    ])
    .png()
    .toFile(path.join(root, "src", "app", "opengraph-image.png"));
  console.log("  ✓ src/app/opengraph-image.png");

  console.log("\n🎉 All icons generated!");
}

/**
 * Build a minimal .ico file from PNG buffers.
 * ICO format: 6-byte header, 16-byte directory entries, then PNG data.
 */
function buildIco(images) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  let dataOffset = headerSize + dirSize;

  // Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: ICO
  header.writeUInt16LE(images.length, 4); // Count

  const dirEntries = [];
  const dataBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // Width (0 = 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(dataOffset, 12); // Offset to image data

    dirEntries.push(entry);
    dataBuffers.push(img.buffer);
    dataOffset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...dataBuffers]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
