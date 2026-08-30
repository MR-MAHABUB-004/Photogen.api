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
  "water.png"
);

const FONT_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "font",
  "water.ttf"
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

let FONT_FAMILY = "sans-serif";

if (fs.existsSync(FONT_PATH)) {
  try {
    const loaded = GlobalFonts.registerFromPath(
      FONT_PATH,
      "WaterFont"
    );

    if (loaded) {
      FONT_FAMILY = "WaterFont";
      console.log("✓ Water font loaded successfully");
    }
  } catch (error) {
    console.log(
      "⚠ Water font error:",
      error.message
    );
  }
} else {
  console.log(
    "⚠ water.ttf not found, using sans-serif fallback"
  );
}


// =====================================================
// WATER TEXT SETTINGS
// =====================================================

const TEXT_AREA = {

  // Image-এর মাঝখানে text ভাসবে

  centerX: 768,
  centerY: 512,


  // Maximum safe text area

  maxWidth: 1280,
  maxHeight: 300,


  // Water ripple ভাবের জন্য সামান্য angle

  angle: -1.5,


  // Optical positioning

  opticalOffsetX: 0,
  opticalOffsetY: 0,


  // Emboss depth (highlight / shadow offset, design px)

  embossDepth: 4,


  padding: 60
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
    return "#0B2A4A";
  }

  const value =
    String(color).trim();

  if (
    /^#[0-9A-Fa-f]{6}$/.test(value)
  ) {
    return value;
  }

  return "#0B2A4A";
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


  let maxSize = 220;


  const customSize =
    Number(requestedFontSize);


  if (
    Number.isFinite(customSize) &&
    customSize >= 20 &&
    customSize <= 320
  ) {
    maxSize = customSize;
  }


  for (
    let size = maxSize;
    size >= 20;
    size--
  ) {

    ctx.font =
      `800 ${size}px "${FONT_FAMILY}"`;


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
// DRAW TEXT SHAPE ONTO A CONTEXT
// (helper reused for base / highlight / shadow passes)
// =====================================================

function drawTextPass(
  ctx,
  text,
  x,
  y,
  fillStyle
) {

  ctx.fillStyle =
    fillStyle;

  ctx.fillText(
    text,
    x,
    y
  );

}


// =====================================================
// CREATE HIGH QUALITY "SUNK IN WATER" TEXT LAYERS
//
// Instead of drawing solid colored text, we build THREE
// separate masks that get composited onto the real photo
// with blend modes in sharp:
//
//   1. shadowMask  -> multiply, offset down-right  (depth)
//   2. highlightMask -> screen, offset up-left      (rim light)
//   3. fillMask     -> multiply, centered           (darkens
//                       the water so the shape reads clearly)
//
// Because every mask is only opaque where the glyphs are,
// the underlying wave texture shows through everywhere else,
// which is what makes the text look "carved" into the water
// instead of just printed on top of it.
// =====================================================

function createTextLayers(
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
    `800 ${scaledFontSize}px "${FONT_FAMILY}"`;


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


  const emboss =
    TEXT_AREA.embossDepth * scale;


  const canvasWidth =
    textWidth +
    padding * 2 +
    emboss * 2;


  const canvasHeight =
    textHeight +
    padding * 2 +
    emboss * 2;


  const x =
    canvasWidth / 2;


  const y =
    canvasHeight / 2;


  function newLayerCanvas() {

    const canvas =
      createCanvas(
        canvasWidth,
        canvasHeight
      );

    const ctx =
      canvas.getContext("2d");

    ctx.font =
      `800 ${scaledFontSize}px "${FONT_FAMILY}"`;

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    return { canvas, ctx };

  }


  // =================================================
  // 1) FILL MASK — darkens the water in the text shape
  // =================================================

  const fillLayer =
    newLayerCanvas();

  drawTextPass(
    fillLayer.ctx,
    text,
    x,
    y,
    color
  );


  // =================================================
  // 2) SHADOW MASK — offset down/right, multiplied in
  //    to sink the shape into the surface
  // =================================================

  const shadowLayer =
    newLayerCanvas();

  drawTextPass(
    shadowLayer.ctx,
    text,
    x + emboss,
    y + emboss,
    "#000814"
  );


  // =================================================
  // 3) HIGHLIGHT MASK — offset up/left, screened in
  //    to catch the light like a wet ripple edge
  // =================================================

  const highlightLayer =
    newLayerCanvas();

  drawTextPass(
    highlightLayer.ctx,
    text,
    x - emboss,
    y - emboss,
    "#EAF6FF"
  );


  return {

    fillBuffer:
      fillLayer.canvas.toBuffer("image/png"),

    shadowBuffer:
      shadowLayer.canvas.toBuffer("image/png"),

    highlightBuffer:
      highlightLayer.canvas.toBuffer("image/png"),

    width:
      Math.ceil(canvasWidth / scale),

    height:
      Math.ceil(canvasHeight / scale),

    fontSize

  };

}


// =====================================================
// PREP ONE MASK BUFFER: resize down + rotate to match
// the ripple angle, matte edges kept transparent
// =====================================================

async function prepMask(
  buffer,
  finalWidth,
  finalHeight
) {

  return sharp(buffer)

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

    .blur(0.6)

    .png()

    .toBuffer();

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
      "Water template image not found: assets/water.png"
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
  // CREATE MASKS
  // =================================================

  const layers =
    createTextLayers(
      text,
      options
    );


  const finalWidth =
    Math.max(
      1,
      Math.round(
        layers.width *
        scaleX
      )
    );


  const finalHeight =
    Math.max(
      1,
      Math.round(
        layers.height *
        scaleY
      )
    );


  const [
    fillMask,
    shadowMask,
    highlightMask
  ] = await Promise.all([

    prepMask(
      layers.fillBuffer,
      finalWidth,
      finalHeight
    ),

    prepMask(
      layers.shadowBuffer,
      finalWidth,
      finalHeight
    ),

    prepMask(
      layers.highlightBuffer,
      finalWidth,
      finalHeight
    )

  ]);


  const maskMeta =
    await sharp(
      fillMask
    ).metadata();


  if (
    !maskMeta.width ||
    !maskMeta.height
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
      maskMeta.width / 2 +
      TEXT_AREA.opticalOffsetX *
      scaleX
    );


  let top =
    Math.round(
      centerY -
      maskMeta.height / 2 +
      TEXT_AREA.opticalOffsetY *
      scaleY
    );


  left =
    Math.max(
      0,
      Math.min(
        left,
        imageWidth -
        maskMeta.width
      )
    );


  top =
    Math.max(
      0,
      Math.min(
        top,
        imageHeight -
        maskMeta.height
      )
    );


  // =================================================
  // COMPOSITE — shadow, then highlight, then fill,
  // stacked with real blend modes so the wave texture
  // still shows through the letters
  // =================================================

  let image =
    sharp(TEMPLATE_PATH)
      .composite([

        {
          input: shadowMask,
          left,
          top,
          blend: "multiply"
        },

        {
          input: highlightMask,
          left,
          top,
          blend: "screen"
        },

        {
          input: fillMask,
          left,
          top,
          blend: "multiply"
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
