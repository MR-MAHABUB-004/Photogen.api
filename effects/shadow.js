"use strict";

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const {
  createCanvas,
  GlobalFonts
} = require("@napi-rs/canvas");

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "shadow.jpg"
);

const FONT_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "font",
  "shadow.ttf"
);

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;

const TEXT_SCALE = 3;

let FONT_FAMILY = "Impact";

if (fs.existsSync(FONT_PATH)) {
  try {
    const loaded = GlobalFonts.registerFromPath(
      FONT_PATH,
      "ShadowFont"
    );

    if (loaded) {
      FONT_FAMILY = "ShadowFont";
    }
  } catch (error) {
    console.log(
      "Shadow font error:",
      error.message
    );
  }
}

const BANNER = {
  centerX: 1025,
  centerY: 530,

  maxWidth: 610,
  maxHeight: 145,

  angle: 19,

  opticalOffsetX: -3,
  opticalOffsetY: 8,

  shadowX: 5,
  shadowY: 7,

  padding: 35
};


function normalizeText(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
}


function getSafeColor(color) {
  if (!color) {
    return "#28999A";
  }

  const value = String(color).trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }

  return "#28999A";
}


function getBestFontSize(
  text,
  requestedFontSize
) {

  const canvas = createCanvas(10, 10);
  const ctx = canvas.getContext("2d");

  let maxSize = 150;

  const customSize =
    Number(requestedFontSize);

  if (
    Number.isFinite(customSize) &&
    customSize >= 15 &&
    customSize <= 250
  ) {
    maxSize = customSize;
  }

  for (
    let size = maxSize;
    size >= 15;
    size--
  ) {

    ctx.font =
      `900 ${size}px "${FONT_FAMILY}"`;

    const metrics =
      ctx.measureText(text);

    const textHeight =
      (metrics.actualBoundingBoxAscent || size * 0.8) +
      (metrics.actualBoundingBoxDescent || size * 0.2);

    if (
      metrics.width <= BANNER.maxWidth &&
      textHeight <= BANNER.maxHeight
    ) {
      return size;
    }
  }

  return 15;
}


function createTextLayer(
  text,
  options = {}
) {

  const fontSize =
    getBestFontSize(
      text,
      options.fontSize
    );

  const color =
    getSafeColor(
      options.color
    );

  const scale = TEXT_SCALE;

  const scaledFontSize =
    fontSize * scale;


  const measureCanvas =
    createCanvas(10, 10);

  const measureCtx =
    measureCanvas.getContext("2d");

  measureCtx.font =
    `900 ${scaledFontSize}px "${FONT_FAMILY}"`;

  const metrics =
    measureCtx.measureText(text);


  const textWidth =
    Math.ceil(metrics.width);

  const textHeight =
    Math.ceil(
      (metrics.actualBoundingBoxAscent || scaledFontSize * 0.8) +
      (metrics.actualBoundingBoxDescent || scaledFontSize * 0.2)
    );


  const padding =
    BANNER.padding * scale;

  const shadowX =
    BANNER.shadowX * scale;

  const shadowY =
    BANNER.shadowY * scale;


  const canvasWidth =
    textWidth +
    padding * 2 +
    Math.abs(shadowX) * 2;

  const canvasHeight =
    textHeight +
    padding * 2 +
    Math.abs(shadowY) * 2;


  const canvas =
    createCanvas(
      canvasWidth,
      canvasHeight
    );

  const ctx =
    canvas.getContext("2d");

  ctx.font =
    `900 ${scaledFontSize}px "${FONT_FAMILY}"`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const x =
    canvasWidth / 2 -
    shadowX / 2;

  const y =
    canvasHeight / 2 -
    shadowY / 2;


  // SHADOW

  ctx.fillStyle = "#061718";
  ctx.strokeStyle = "#061718";

  ctx.lineWidth =
    Math.max(
      2.5 * scale,
      scaledFontSize * 0.03
    );

  ctx.strokeText(
    text,
    x + shadowX,
    y + shadowY
  );

  ctx.fillText(
    text,
    x + shadowX,
    y + shadowY
  );


  // MAIN GRADIENT

  const gradient =
    ctx.createLinearGradient(
      0,
      y - scaledFontSize / 2,
      0,
      y + scaledFontSize / 2
    );

  gradient.addColorStop(0, "#4DB5B4");
  gradient.addColorStop(0.45, color);
  gradient.addColorStop(1, "#147678");


  // OUTLINE

  ctx.strokeStyle = "#07595B";

  ctx.lineWidth =
    Math.max(
      2.5 * scale,
      scaledFontSize * 0.028
    );

  ctx.lineJoin = "round";

  ctx.strokeText(text, x, y);


  // TEXT

  ctx.fillStyle = gradient;

  ctx.fillText(text, x, y);


  return {
    buffer: canvas.toBuffer("image/png"),

    width:
      Math.round(canvasWidth / scale),

    height:
      Math.round(canvasHeight / scale)
  };
}


function createBannerCover(
  actualWidth,
  actualHeight
) {

  const sx =
    actualWidth / DESIGN_WIDTH;

  const sy =
    actualHeight / DESIGN_HEIGHT;


  const points = [
    [665, 335],
    [1385, 555],
    [1350, 750],
    [635, 575]
  ];


  const polygon =
    points
      .map(
        ([x, y]) =>
          `${x * sx},${y * sy}`
      )
      .join(" ");


  return `
<svg
xmlns="http://www.w3.org/2000/svg"
width="${actualWidth}"
height="${actualHeight}"
>
<polygon
points="${polygon}"
fill="#111416"
/>
</svg>
`;
}


async function generate(
  text,
  options = {}
) {

  text =
    normalizeText(text);

  if (!text) {
    throw new Error("Text is required");
  }


  const metadata =
    await sharp(
      TEMPLATE_PATH
    ).metadata();


  const imageWidth =
    metadata.width;

  const imageHeight =
    metadata.height;


  const scaleX =
    imageWidth / DESIGN_WIDTH;

  const scaleY =
    imageHeight / DESIGN_HEIGHT;


  const textLayer =
    createTextLayer(
      text,
      options
    );


  const finalWidth =
    Math.max(
      1,
      Math.round(
        textLayer.width * scaleX
      )
    );

  const finalHeight =
    Math.max(
      1,
      Math.round(
        textLayer.height * scaleY
      )
    );


  const rotatedText =
    await sharp(
      textLayer.buffer
    )

      .resize(
        finalWidth,
        finalHeight,
        {
          kernel:
            sharp.kernel.lanczos3
        }
      )

      .rotate(
        BANNER.angle,
        {
          background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0
          }
        }
      )

      .sharpen({
        sigma: 0.5
      })

      .png()

      .toBuffer();


  const rotatedMeta =
    await sharp(
      rotatedText
    ).metadata();


  const centerX =
    BANNER.centerX * scaleX;

  const centerY =
    BANNER.centerY * scaleY;


  const left =
    Math.round(
      centerX -
      rotatedMeta.width / 2 +
      BANNER.opticalOffsetX * scaleX
    );

  const top =
    Math.round(
      centerY -
      rotatedMeta.height / 2 +
      BANNER.opticalOffsetY * scaleY
    );


  const bannerCover =
    createBannerCover(
      imageWidth,
      imageHeight
    );


  let image =
    sharp(TEMPLATE_PATH)
      .composite([
        {
          input: Buffer.from(bannerCover)
        },
        {
          input: rotatedText,

          left: Math.max(0, left),

          top: Math.max(0, top)
        }
      ]);


  if (options.width) {

    image =
      image.resize({

        width:
          Number(options.width),

        height:
          options.height
            ? Number(options.height)
            : undefined,

        fit: "cover",

        kernel:
          sharp.kernel.lanczos3

      });

  }


  const format =
    String(
      options.format || "jpg"
    ).toLowerCase();


  if (format === "png") {
    return image.png().toBuffer();
  }


  if (format === "webp") {
    return image
      .webp({
        quality: 98
      })
      .toBuffer();
  }


  return image
    .jpeg({
      quality: 100,
      chromaSubsampling: "4:4:4"
    })
    .toBuffer();
}


module.exports = {
  generate
};
