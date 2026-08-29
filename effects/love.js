"use strict";

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const {
  createCanvas,
  GlobalFonts
} = require("@napi-rs/canvas");


// =====================================================
// PATHS
// =====================================================

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "love.png"
);

const FONT_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "font",
  "love.ttf"
);


// =====================================================
// ORIGINAL IMAGE SIZE
// =====================================================

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;


// =====================================================
// HIGH QUALITY TEXT SCALE
// =====================================================

const TEXT_SCALE = 3;


// =====================================================
// LOAD FONT
// =====================================================

let FONT_FAMILY = "serif";

if (fs.existsSync(FONT_PATH)) {
  try {
    const loaded = GlobalFonts.registerFromPath(
      FONT_PATH,
      "LoveFont"
    );

    if (loaded) {
      FONT_FAMILY = "LoveFont";
      console.log("✓ Love font loaded successfully");
    }
  } catch (error) {
    console.log(
      "⚠ Love font error:",
      error.message
    );
  }
} else {
  console.log(
    "⚠ love.ttf not found, using serif fallback"
  );
}


// =====================================================
// LOVE TEXT SETTINGS
// =====================================================

const TEXT_AREA = {

  // Image-এর মাঝখানে text

  centerX: 768,
  centerY: 525,


  // Maximum safe text area

  maxWidth: 1280,
  maxHeight: 310,


  // Original text সামান্য angle এ

  angle: -2,


  // Optical positioning

  opticalOffsetX: 0,
  opticalOffsetY: 0,


  // 3D depth

  shadowX: 8,
  shadowY: 13,


  padding: 50
};


// =====================================================
// TEXT NORMALIZE
// =====================================================

function normalizeText(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
}


// =====================================================
// SAFE COLOR
// =====================================================

function getSafeColor(color) {

  if (!color) {
    return "#E8C0FF";
  }

  const value =
    String(color).trim();

  if (
    /^#[0-9A-Fa-f]{6}$/.test(value)
  ) {
    return value;
  }

  return "#E8C0FF";
}


// =====================================================
// FIND BEST FONT SIZE
// =====================================================

function getBestFontSize(
  text,
  requestedFontSize
) {

  const canvas =
    createCanvas(10, 10);

  const ctx =
    canvas.getContext("2d");


  let maxSize = 250;


  const customSize =
    Number(requestedFontSize);


  if (
    Number.isFinite(customSize) &&
    customSize >= 20 &&
    customSize <= 350
  ) {
    maxSize = customSize;
  }


  for (
    let size = maxSize;
    size >= 20;
    size--
  ) {

    ctx.font =
      `900 ${size}px "${FONT_FAMILY}"`;


    const metrics =
      ctx.measureText(text);


    const textHeight =
      (
        metrics.actualBoundingBoxAscent ||
        size * 0.8
      )
      +
      (
        metrics.actualBoundingBoxDescent ||
        size * 0.2
      );


    if (
      metrics.width <=
        TEXT_AREA.maxWidth
      &&
      textHeight <=
        TEXT_AREA.maxHeight
    ) {

      return size;

    }

  }


  return 20;
}


// =====================================================
// CREATE HIGH QUALITY TEXT
// =====================================================

function createTextLayer(
  text,
  options = {}
) {

  const fontSize =
    getBestFontSize(
      text,
      options.fontSize
    );


  const scale =
    TEXT_SCALE;


  const scaledFontSize =
    fontSize * scale;


  const color =
    getSafeColor(
      options.color
    );


  // Measure text

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
      (
        metrics.actualBoundingBoxAscent ||
        scaledFontSize * 0.8
      )
      +
      (
        metrics.actualBoundingBoxDescent ||
        scaledFontSize * 0.2
      )
    );


  const padding =
    TEXT_AREA.padding * scale;


  const shadowX =
    TEXT_AREA.shadowX * scale;


  const shadowY =
    TEXT_AREA.shadowY * scale;


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


  ctx.textAlign =
    "center";


  ctx.textBaseline =
    "middle";


  const x =
    canvasWidth / 2;


  const y =
    canvasHeight / 2;


  // =================================================
  // 3D DARK DEPTH
  // =================================================

  ctx.fillStyle =
    "#26002F";

  ctx.strokeStyle =
    "#26002F";

  ctx.lineWidth =
    Math.max(
      3 * scale,
      scaledFontSize * 0.025
    );


  // Multiple layers = stronger 3D depth

  for (
    let i = 10 * scale;
    i >= 2 * scale;
    i -= scale
  ) {

    ctx.strokeText(
      text,
      x + i * 0.35,
      y + i * 0.45
    );

    ctx.fillText(
      text,
      x + i * 0.35,
      y + i * 0.45
    );

  }


  // =================================================
  // PURPLE GLOW
  // =================================================

  ctx.shadowColor =
    "rgba(180, 40, 255, 0.55)";

  ctx.shadowBlur =
    18 * scale;

  ctx.shadowOffsetX =
    0;

  ctx.shadowOffsetY =
    8 * scale;


  // =================================================
  // OUTLINE
  // =================================================

  ctx.strokeStyle =
    "#B856FF";

  ctx.lineWidth =
    Math.max(
      2 * scale,
      scaledFontSize * 0.018
    );

  ctx.lineJoin =
    "round";


  ctx.strokeText(
    text,
    x,
    y
  );


  // =================================================
  // MAIN PURPLE GRADIENT
  // =================================================

  ctx.shadowColor =
    "transparent";


  const gradient =
    ctx.createLinearGradient(
      0,
      y - scaledFontSize / 2,
      0,
      y + scaledFontSize / 2
    );


  gradient.addColorStop(
    0,
    "#FFF6FF"
  );


  gradient.addColorStop(
    0.15,
    "#F5D6FF"
  );


  gradient.addColorStop(
    0.45,
    color
  );


  gradient.addColorStop(
    0.75,
    "#B85DE3"
  );


  gradient.addColorStop(
    1,
    "#71308E"
  );


  ctx.fillStyle =
    gradient;


  ctx.fillText(
    text,
    x,
    y
  );


  return {

    buffer:
      canvas.toBuffer("image/png"),


    width:
      Math.ceil(
        canvasWidth / scale
      ),


    height:
      Math.ceil(
        canvasHeight / scale
      ),


    fontSize
  };
}


// =====================================================
// GENERATE EFFECT
// =====================================================

async function generate(
  text,
  options = {}
) {

  text =
    normalizeText(text);


  if (!text) {
    throw new Error(
      "Text is required"
    );
  }


  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(
      "Love template image not found: assets/love.png"
    );
  }


  // =================================================
  // TEMPLATE METADATA
  // =================================================

  const metadata =
    await sharp(
      TEMPLATE_PATH
    ).metadata();


  const imageWidth =
    metadata.width;


  const imageHeight =
    metadata.height;


  if (
    !imageWidth ||
    !imageHeight
  ) {

    throw new Error(
      "Invalid template image"
    );

  }


  const scaleX =
    imageWidth /
    DESIGN_WIDTH;


  const scaleY =
    imageHeight /
    DESIGN_HEIGHT;


  // =================================================
  // CREATE TEXT
  // =================================================

  const textLayer =
    createTextLayer(
      text,
      options
    );


  // =================================================
  // FINAL TEXT SIZE
  // =================================================

  const finalWidth =
    Math.max(
      1,
      Math.round(
        textLayer.width *
        scaleX
      )
    );


  const finalHeight =
    Math.max(
      1,
      Math.round(
        textLayer.height *
        scaleY
      )
    );


  // =================================================
  // ROTATE
  // =================================================

  const finalText =
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
        TEXT_AREA.angle,
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
        sigma: 0.6
      })

      .png()

      .toBuffer();


  // =================================================
  // GET TEXT SIZE
  // =================================================

  const textMeta =
    await sharp(
      finalText
    ).metadata();


  if (
    !textMeta.width ||
    !textMeta.height
  ) {

    throw new Error(
      "Unable to generate text layer"
    );

  }


  // =================================================
  // CENTER POSITION
  // =================================================

  const centerX =
    TEXT_AREA.centerX *
    scaleX;


  const centerY =
    TEXT_AREA.centerY *
    scaleY;


  let left =
    Math.round(
      centerX -
      textMeta.width / 2 +
      TEXT_AREA.opticalOffsetX *
      scaleX
    );


  let top =
    Math.round(
      centerY -
      textMeta.height / 2 +
      TEXT_AREA.opticalOffsetY *
      scaleY
    );


  // =================================================
  // SAFE BOUNDARY
  // =================================================

  left =
    Math.max(
      0,
      Math.min(
        left,
        imageWidth -
        textMeta.width
      )
    );


  top =
    Math.max(
      0,
      Math.min(
        top,
        imageHeight -
        textMeta.height
      )
    );


  // =================================================
  // COMPOSITE
  // =================================================

  let image =
    sharp(TEMPLATE_PATH)
      .composite([

        {
          input: finalText,

          left,
          top
        }

      ]);


  // =================================================
  // OPTIONAL RESIZE
  // =================================================

  const outputWidth =
    Number(options.width);

  const outputHeight =
    Number(options.height);


  if (
    Number.isFinite(outputWidth) &&
    outputWidth >= 100 &&
    outputWidth <= 4000
  ) {

    image =
      image.resize({

        width:
          Math.floor(
            outputWidth
          ),

        height:
          Number.isFinite(
            outputHeight
          )
          &&
          outputHeight >= 100
          &&
          outputHeight <= 4000

            ? Math.floor(
                outputHeight
              )

            : undefined,

        fit:
          "cover",

        kernel:
          sharp.kernel.lanczos3

      });

  }


  // =================================================
  // OUTPUT FORMAT
  // =================================================

  const format =
    String(
      options.format ||
      "jpg"
    )
      .toLowerCase();


  if (
    format === "png"
  ) {

    return image
      .png()
      .toBuffer();

  }


  if (
    format === "webp"
  ) {

    return image
      .webp({
        quality: 98
      })
      .toBuffer();

  }


  return image
    .jpeg({
      quality: 100,
      chromaSubsampling:
        "4:4:4"
    })
    .toBuffer();

}


// =====================================================
// EXPORT
// =====================================================

module.exports = {
  generate
};
