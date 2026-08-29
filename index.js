"use strict";

const express = require("express");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const {
  createCanvas,
  GlobalFonts
} = require("@napi-rs/canvas");

const app = express();

const PORT = process.env.PORT || 3000;

const TEMPLATE_PATH = path.join(__dirname, "assets", "template.jpg");
const FONT_PATH = path.join(__dirname, "assets", "font.ttf");

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;

let FONT_FAMILY = "Impact";

if (fs.existsSync(FONT_PATH)) {
  try {
    const loaded = GlobalFonts.registerFromPath(FONT_PATH, "BannerFont");
    if (loaded) {
      FONT_FAMILY = "BannerFont";
      console.log("✓ Custom font loaded successfully");
    } else {
      console.log("⚠ Font load failed, using Impact");
    }
  } catch (error) {
    console.log("⚠ Font error:", error.message);
  }
} else {
  console.log("⚠ font.ttf not found, using Impact fallback");
}

const BANNER = {
  centerX: 1025,
  centerY: 530,
  maxWidth: 610,
  maxHeight: 145,
  angle: 19,
  opticalOffsetX: -3,
  opticalOffsetY: -4,
  shadowX: 5,
  shadowY: 7,
  padding: 35
};

function getSafeColor(color) {
  if (!color) return "#28999A";
  const value = String(color).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  return "#28999A";
}

function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function getBestFontSize(text, requestedFontSize) {
  const canvas = createCanvas(10, 10);
  const ctx = canvas.getContext("2d");
  let maxSize = 150;
  const customSize = Number(requestedFontSize);
  if (Number.isFinite(customSize) && customSize >= 15 && customSize <= 250) {
    maxSize = customSize;
  }
  for (let size = maxSize; size >= 15; size--) {
    ctx.font = `900 ${size}px "${FONT_FAMILY}"`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight =
      (metrics.actualBoundingBoxAscent || size * 0.8) +
      (metrics.actualBoundingBoxDescent || size * 0.2);
    if (textWidth <= BANNER.maxWidth && textHeight <= BANNER.maxHeight) {
      return size;
    }
  }
  return 15;
}

function createTextLayer(text, options = {}) {
  const fontSize = getBestFontSize(text, options.fontSize);
  const color = getSafeColor(options.color);

  const measureCanvas = createCanvas(10, 10);
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = `900 ${fontSize}px "${FONT_FAMILY}"`;
  const metrics = measureCtx.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(
    (metrics.actualBoundingBoxAscent || fontSize * 0.8) +
      (metrics.actualBoundingBoxDescent || fontSize * 0.2)
  );

  const padding = BANNER.padding;
  const canvasWidth = textWidth + padding * 2 + Math.abs(BANNER.shadowX);
  const canvasHeight = textHeight + padding * 2 + Math.abs(BANNER.shadowY);

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  ctx.font = `900 ${fontSize}px "${FONT_FAMILY}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const x = canvasWidth / 2 - BANNER.shadowX / 2;
  const y = canvasHeight / 2 - BANNER.shadowY / 2;

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#061718";
  ctx.strokeStyle = "#061718";
  ctx.lineWidth = Math.max(2.5, fontSize * 0.03);
  ctx.strokeText(text, x + BANNER.shadowX, y + BANNER.shadowY);
  ctx.fillText(text, x + BANNER.shadowX, y + BANNER.shadowY);

  const gradient = ctx.createLinearGradient(0, y - fontSize / 2, 0, y + fontSize / 2);
  gradient.addColorStop(0, "#42AAAA");
  gradient.addColorStop(0.45, color);
  gradient.addColorStop(1, "#167C7E");

  ctx.strokeStyle = "#075A5C";
  ctx.lineWidth = Math.max(2.5, fontSize * 0.028);
  ctx.lineJoin = "round";
  ctx.strokeText(text, x, y);

  ctx.fillStyle = gradient;
  ctx.fillText(text, x, y);

  return { buffer: canvas.toBuffer("image/png"), width: canvasWidth, height: canvasHeight, fontSize };
}

function createBannerCover(actualWidth, actualHeight) {
  const sx = actualWidth / DESIGN_WIDTH;
  const sy = actualHeight / DESIGN_HEIGHT;
  const points = [
    [665, 335],
    [1385, 555],
    [1350, 750],
    [635, 575]
  ];
  const polygon = points.map(([x, y]) => `${x * sx},${y * sy}`).join(" ");
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${actualWidth}" height="${actualHeight}">
  <polygon points="${polygon}" fill="#111416" />
</svg>
`;
}

app.get("/", async (req, res) => {
  try {
    const metadata = await sharp(TEMPLATE_PATH).metadata();
    res.json({
      status: true,
      message: "Custom Banner Text API",
      font: FONT_FAMILY,
      template: { width: metadata.width, height: metadata.height }
    });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
});

app.get("/api", async (req, res) => {
  try {
    const { effectName, text, fontSize, color, format, w, h } = req.query;
    const userText = normalizeText(effectName || text);

    if (!userText) {
      return res.status(400).json({ status: false, error: "effectName is required" });
    }
    if ([...userText].length > 60) {
      return res.status(400).json({ status: false, error: "Maximum 60 characters allowed" });
    }

    const metadata = await sharp(TEMPLATE_PATH).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    if (!imageWidth || !imageHeight) throw new Error("Invalid template image");

    const scaleX = imageWidth / DESIGN_WIDTH;
    const scaleY = imageHeight / DESIGN_HEIGHT;

    const textLayer = createTextLayer(userText, { fontSize, color });

    const scaledWidth = Math.max(1, Math.round(textLayer.width * scaleX));
    const scaledHeight = Math.max(1, Math.round(textLayer.height * scaleY));

    const rotatedText = await sharp(textLayer.buffer)
      .resize(scaledWidth, scaledHeight, { kernel: "lanczos3" })
      .rotate(BANNER.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .sharpen()
      .png()
      .toBuffer();

    const rotatedMeta = await sharp(rotatedText).metadata();
    if (!rotatedMeta.width || !rotatedMeta.height) throw new Error("Unable to read generated text");

    const centerX = BANNER.centerX * scaleX;
    const centerY = BANNER.centerY * scaleY;

    let left = Math.round(centerX - rotatedMeta.width / 2 + BANNER.opticalOffsetX * scaleX);
    let top = Math.round(centerY - rotatedMeta.height / 2 + BANNER.opticalOffsetY * scaleY);

    left = Math.max(0, Math.min(left, imageWidth - rotatedMeta.width));
    top = Math.max(0, Math.min(top, imageHeight - rotatedMeta.height));

    const bannerCover = createBannerCover(imageWidth, imageHeight);

    let image = sharp(TEMPLATE_PATH).composite([
      { input: Buffer.from(bannerCover), top: 0, left: 0 },
      { input: rotatedText, left, top }
    ]);

    const outputWidth = Number(w);
    const outputHeight = Number(h);
    if (Number.isFinite(outputWidth) && outputWidth >= 100 && outputWidth <= 4000) {
      image = image.resize({
        width: Math.floor(outputWidth),
        height:
          Number.isFinite(outputHeight) && outputHeight >= 100 && outputHeight <= 4000
            ? Math.floor(outputHeight)
            : undefined,
        fit: "cover"
      });
    }

    const outputFormat = String(format || "jpg").toLowerCase();
    res.setHeader("Cache-Control", "no-store");

    if (outputFormat === "png") {
      const buffer = await image.png().toBuffer();
      res.type("image/png");
      return res.send(buffer);
    }
    if (outputFormat === "webp") {
      const buffer = await image.webp({ quality: 95 }).toBuffer();
      res.type("image/webp");
      return res.send(buffer);
    }

    const buffer = await image.jpeg({ quality: 96, mozjpeg: true }).toBuffer();
    res.type("image/jpeg");
    return res.send(buffer);
  } catch (error) {
    console.error("IMAGE ERROR:", error);
    return res.status(500).json({ status: false, error: "Failed to generate image", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
