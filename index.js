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


// =====================================================
// PATHS
// =====================================================

const TEMPLATE_PATH = path.join(
  __dirname,
  "assets",
  "template.jpg"
);

const FONT_PATH = path.join(
  __dirname,
  "assets",
  "font.ttf"
);


// =====================================================
// DESIGN SIZE
// =====================================================

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;


// =====================================================
// FONT
// =====================================================

let FONT_FAMILY = "Impact";

if (fs.existsSync(FONT_PATH)) {
  try {
    GlobalFonts.registerFromPath(
      FONT_PATH,
      "BannerFont"
    );

    FONT_FAMILY = "BannerFont";

    console.log("Custom font loaded");
  } catch (error) {
    console.log("Custom font failed:", error.message);
  }
}


// =====================================================
// BANNER CONFIG
// =====================================================

const BANNER = {

  // Original image coordinate অনুযায়ী
  centerX: 1010,
  centerY: 535,

  // Text-এর maximum safe area
  maxWidth: 610,
  maxHeight: 145,

  // Banner-এর direction
  angle: 19,

  // Perspective feeling
  skewX: -3.5,

  // Small sharp shadow
  shadowX: 5,
  shadowY: 7,

  // Padding
  padding: 20
};


// =====================================================
// COLOR
// =====================================================

function getSafeColor(color) {

  if (
    color &&
    /^#[0-9a-fA-F]{6}$/.test(String(color))
  ) {
    return String(color);
  }

  // Muted realistic cyan
  return "#28999A";
}


// =====================================================
// FONT SIZE
// =====================================================

function getBestFontSize(
  text,
  requestedFontSize
) {

  const canvas = createCanvas(10, 10);
  const ctx = canvas.getContext("2d");

  let maxSize = 145;

  const customSize = Number(requestedFontSize);

  if (
    Number.isFinite(customSize) &&
    customSize >= 15 &&
    customSize <= 250
  ) {
    maxSize = Math.min(customSize, 250);
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

    const width =
      metrics.width;

    const height =
      (metrics.actualBoundingBoxAscent || size * 0.8) +
      (metrics.actualBoundingBoxDescent || size * 0.2);

    if (
      width <= BANNER.maxWidth &&
      height <= BANNER.maxHeight
    ) {
      return size;
    }
  }

  return 15;
}


// =====================================================
// CREATE TEXT
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

  const color =
    getSafeColor(
      options.color
    );


  // -----------------------------------------------
  // Measure exact text
  // -----------------------------------------------

  const measureCanvas =
    createCanvas(10, 10);

  const measureCtx =
    measureCanvas.getContext("2d");

  measureCtx.font =
    `900 ${fontSize}px "${FONT_FAMILY}"`;

  const metrics =
    measureCtx.measureText(text);

  const textWidth =
    Math.ceil(metrics.width);

  const textHeight =
    Math.ceil(
      (metrics.actualBoundingBoxAscent || fontSize * 0.8) +
      (metrics.actualBoundingBoxDescent || fontSize * 0.2)
    );


  // Enough room for shadow
  const padding = 35;

  const canvasWidth =
    textWidth + padding * 2;

  const canvasHeight =
    textHeight + padding * 2;


  const canvas =
    createCanvas(
      canvasWidth,
      canvasHeight
    );

  const ctx =
    canvas.getContext("2d");


  ctx.font =
    `900 ${fontSize}px "${FONT_FAMILY}"`;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";


  const x =
    canvasWidth / 2;

  const y =
    canvasHeight / 2;


  // =================================================
  // SHARP HARD SHADOW
  // =================================================

  ctx.shadowColor =
    "transparent";

  ctx.fillStyle =
    "#071415";

  ctx.strokeStyle =
    "#071415";

  ctx.lineWidth =
    Math.max(
      2,
      fontSize * 0.025
    );

  // শুধু একবার shadow
  ctx.strokeText(
    text,
    x + BANNER.shadowX,
    y + BANNER.shadowY
  );

  ctx.fillText(
    text,
    x + BANNER.shadowX,
    y + BANNER.shadowY
  );


  // =================================================
  // DARK OUTLINE
  // =================================================

  ctx.strokeStyle =
    "#075A5C";

  ctx.lineWidth =
    Math.max(
      1.2,
      fontSize * 0.015
    );


  // =================================================
  // REALISTIC GRADIENT
  // =================================================

  const gradient =
    ctx.createLinearGradient(
      0,
      y - fontSize / 2,
      0,
      y + fontSize / 2
    );

  gradient.addColorStop(
    0,
    "#42AAAA"
  );

  gradient.addColorStop(
    0.5,
    color
  );

  gradient.addColorStop(
    1,
    "#167C7E"
  );


  // Draw sharp outline
  ctx.strokeText(
    text,
    x,
    y
  );


  // Main text
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
      canvasWidth,

    height:
      canvasHeight,

    fontSize

  };
}


// =====================================================
// CREATE ORIGINAL TEXT COVER
// =====================================================

function createBannerCover(
  width,
  height
) {

  const sx =
    width / DESIGN_WIDTH;

  const sy =
    height / DESIGN_HEIGHT;


  // শুধু YOUR TEXT area
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
  width="${width}"
  height="${height}"
>
  <polygon
    points="${polygon}"
    fill="#111416"
  />
</svg>
`;
}


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {

  res.json({

    status: true,

    message:
      "Custom Banner Text API",

    font:
      FONT_FAMILY,

    examples: {

      basic:
        "/api?effectName=MAHABUB",

      full:
        "/api?effectName=MAHABUB%20BRO",

      long:
        "/api?effectName=MR%20MAHABUB%20RAHMAN",

      fontSize:
        "/api?effectName=MAHABUB%20BRO&fontSize=100",

      color:
        "/api?effectName=MAHABUB%20BRO&color=%2328999A",

      png:
        "/api?effectName=MAHABUB%20BRO&format=png"

    }

  });

});


// =====================================================
// API
// =====================================================

app.get("/api", async (req, res) => {

  try {

    const {
      effectName,
      text,
      fontSize,
      color,
      format,
      w,
      h
    } = req.query;


    // -----------------------------------------------
    // TEXT
    // -----------------------------------------------

    const userText =
      String(
        effectName ||
        text ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ");


    if (!userText) {

      return res.status(400).json({
        status: false,
        error: "effectName is required"
      });

    }


    if (
      [...userText].length > 60
    ) {

      return res.status(400).json({
        status: false,
        error: "Maximum 60 characters allowed"
      });

    }


    // -----------------------------------------------
    // TEMPLATE
    // -----------------------------------------------

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


    // -----------------------------------------------
    // CREATE TEXT
    // -----------------------------------------------

    const textLayer =
      createTextLayer(
        userText,
        {
          fontSize,
          color
        }
      );


    // -----------------------------------------------
    // SCALE
    // -----------------------------------------------

    const scaledWidth =
      Math.round(
        textLayer.width * scaleX
      );

    const scaledHeight =
      Math.round(
        textLayer.height * scaleY
      );


    // -----------------------------------------------
    // ROTATE
    // -----------------------------------------------

    const rotatedText =
      await sharp(
        textLayer.buffer
      )

        .resize(
          scaledWidth,
          scaledHeight
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

        .png()
        .toBuffer();


    const rotatedMeta =
      await sharp(
        rotatedText
      ).metadata();


    // -----------------------------------------------
    // POSITION
    // -----------------------------------------------

    const centerX =
      BANNER.centerX *
      scaleX;

    const centerY =
      BANNER.centerY *
      scaleY;


    const left =
      Math.round(
        centerX -
        rotatedMeta.width / 2
      );

    const top =
      Math.round(
        centerY -
        rotatedMeta.height / 2
      );


    // -----------------------------------------------
    // COVER OLD TEXT
    // -----------------------------------------------

    const cover =
      createBannerCover(
        imageWidth,
        imageHeight
      );


    // -----------------------------------------------
    // COMPOSITE
    // -----------------------------------------------

    let image =
      sharp(TEMPLATE_PATH)
        .composite([

          {
            input:
              Buffer.from(cover)
          },

          {
            input:
              rotatedText,

            left: Math.max(0, left),

            top: Math.max(0, top)
          }

        ]);


    // -----------------------------------------------
    // RESIZE
    // -----------------------------------------------

    const outputWidth =
      Number(w);

    const outputHeight =
      Number(h);


    if (
      Number.isFinite(outputWidth) &&
      outputWidth > 0
    ) {

      image =
        image.resize({

          width:
            Math.min(
              Math.floor(outputWidth),
              4000
            ),

          height:

            Number.isFinite(outputHeight) &&
            outputHeight > 0

              ? Math.min(
                  Math.floor(outputHeight),
                  4000
                )

              : undefined,

          fit:
            "cover"

        });

    }


    // -----------------------------------------------
    // OUTPUT
    // -----------------------------------------------

    const outputFormat =
      String(
        format || "jpg"
      ).toLowerCase();


    res.setHeader(
      "Cache-Control",
      "no-store"
    );


    if (
      outputFormat === "png"
    ) {

      const buffer =
        await image
          .png()
          .toBuffer();

      res.type("image/png");

      return res.send(buffer);

    }


    if (
      outputFormat === "webp"
    ) {

      const buffer =
        await image
          .webp({
            quality: 95
          })
          .toBuffer();

      res.type("image/webp");

      return res.send(buffer);

    }


    const buffer =
      await image
        .jpeg({
          quality: 96
        })
        .toBuffer();


    res.type("image/jpeg");

    return res.send(buffer);


  } catch (error) {

    console.error(
      "IMAGE ERROR:",
      error
    );


    return res.status(500).json({

      status: false,

      error:
        "Failed to generate image",

      message:
        error.message

    });

  }

});


// =====================================================
// START
// =====================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);
