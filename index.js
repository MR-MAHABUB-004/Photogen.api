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
// ORIGINAL TEMPLATE DESIGN SIZE
// =====================================================

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;


// =====================================================
// LOAD CUSTOM FONT
// =====================================================

let FONT_FAMILY = "Impact";

if (fs.existsSync(FONT_PATH)) {
  try {
    const loaded = GlobalFonts.registerFromPath(
      FONT_PATH,
      "BannerFont"
    );

    if (loaded) {
      FONT_FAMILY = "BannerFont";
      console.log("✓ Custom font loaded successfully");
    } else {
      console.log("⚠ Font load failed, using Impact");
    }
  } catch (error) {
    console.log(
      "⚠ Font error:",
      error.message
    );
  }
} else {
  console.log(
    "⚠ font.ttf not found, using Impact fallback"
  );
}


// =====================================================
// BANNER SETTINGS
// =====================================================

const BANNER = {

  /*
   * Banner-এর visual center
   */

  centerX: 1025,
  centerY: 530,


  /*
   * Text safe area
   */

  maxWidth: 610,
  maxHeight: 145,


  /*
   * Banner angle
   */

  angle: 19,


  /*
   * Optical correction
   *
   * Shadow থাকার কারণে text visually
   * একটু নিচে/ডানে দেখাতে পারে।
   */

  opticalOffsetX: -3,
  opticalOffsetY: -4,


  /*
   * Hard shadow position
   */

  shadowX: 5,
  shadowY: 7,


  /*
   * Canvas padding
   */

  padding: 35
};


// =====================================================
// GET SAFE COLOR
// =====================================================

function getSafeColor(color) {

  if (!color) {
    return "#28999A";
  }

  const value =
    String(color).trim();

  if (
    /^#[0-9A-Fa-f]{6}$/.test(value)
  ) {
    return value;
  }

  return "#28999A";
}


// =====================================================
// NORMALIZE TEXT
// =====================================================

function normalizeText(text) {

  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
}


// =====================================================
// GET BEST FONT SIZE
// =====================================================

function getBestFontSize(
  text,
  requestedFontSize
) {

  const canvas =
    createCanvas(10, 10);

  const ctx =
    canvas.getContext("2d");


  /*
   * Default maximum size
   */

  let maxSize = 150;


  /*
   * Custom font size
   *
   * এটাকে maximum হিসেবে ধরা হবে।
   * Text fit না হলে automatically ছোট হবে।
   */

  const customSize =
    Number(requestedFontSize);

  if (
    Number.isFinite(customSize) &&
    customSize >= 15 &&
    customSize <= 250
  ) {
    maxSize = customSize;
  }


  /*
   * Actual text measurement
   */

  for (
    let size = maxSize;
    size >= 15;
    size--
  ) {

    ctx.font =
      `900 ${size}px "${FONT_FAMILY}"`;


    const metrics =
      ctx.measureText(text);


    const textWidth =
      metrics.width;


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


    /*
     * Banner-এর safe area-তে fit হলে
     * এই font size ব্যবহার করা হবে।
     */

    if (
      textWidth <= BANNER.maxWidth &&
      textHeight <= BANNER.maxHeight
    ) {
      return size;
    }

  }


  return 15;
}


// =====================================================
// CREATE TEXT LAYER
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


  // =================================================
  // MEASURE TEXT
  // =================================================

  const measureCanvas =
    createCanvas(10, 10);

  const measureCtx =
    measureCanvas.getContext("2d");


  measureCtx.font =
    `900 ${fontSize}px "${FONT_FAMILY}"`;


  const metrics =
    measureCtx.measureText(text);


  const textWidth =
    Math.ceil(
      metrics.width
    );


  const textHeight =
    Math.ceil(
      (
        metrics.actualBoundingBoxAscent ||
        fontSize * 0.8
      )
      +
      (
        metrics.actualBoundingBoxDescent ||
        fontSize * 0.2
      )
    );


  // =================================================
  // CREATE CANVAS
  // =================================================

  const padding =
    BANNER.padding;


  const canvasWidth =
    textWidth +
    padding * 2 +
    Math.abs(BANNER.shadowX);


  const canvasHeight =
    textHeight +
    padding * 2 +
    Math.abs(BANNER.shadowY);


  const canvas =
    createCanvas(
      canvasWidth,
      canvasHeight
    );


  const ctx =
    canvas.getContext("2d");


  ctx.font =
    `900 ${fontSize}px "${FONT_FAMILY}"`;


  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";


  /*
   * পুরো text একই center থেকে render হবে।
   */

  const x =
    canvasWidth / 2 -
    BANNER.shadowX / 2;


  const y =
    canvasHeight / 2 -
    BANNER.shadowY / 2;


  // =================================================
  // HARD SHADOW
  // =================================================

  ctx.shadowColor =
    "transparent";


  ctx.fillStyle =
    "#061718";


  ctx.strokeStyle =
    "#061718";


  ctx.lineWidth =
    Math.max(
      2.5,
      fontSize * 0.03
    );


  /*
   * Single sharp shadow
   */

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
  // MAIN TEXT GRADIENT
  // =================================================

  const gradient =
    ctx.createLinearGradient(
      0,
      y - fontSize / 2,
      0,
      y + fontSize / 2
    );


  /*
   * Realistic muted cyan
   */

  gradient.addColorStop(
    0,
    "#42AAAA"
  );

  gradient.addColorStop(
    0.45,
    color
  );

  gradient.addColorStop(
    1,
    "#167C7E"
  );


  // =================================================
  // THICKER OUTLINE
  // =================================================

  ctx.strokeStyle =
    "#075A5C";


  ctx.lineWidth =
    Math.max(
      2.5,
      fontSize * 0.028
    );


  ctx.lineJoin =
    "round";


  /*
   * Draw outline first
   */

  ctx.strokeText(
    text,
    x,
    y
  );


  // =================================================
  // MAIN TEXT
  // =================================================

  ctx.fillStyle =
    gradient;


  ctx.fillText(
    text,
    x,
    y
  );


  return {

    buffer:
      canvas.toBuffer(
        "image/png"
      ),

    width:
      canvasWidth,

    height:
      canvasHeight,

    fontSize

  };
}


// =====================================================
// CREATE BANNER COVER
// =====================================================

function createBannerCover(
  actualWidth,
  actualHeight
) {

  const sx =
    actualWidth /
    DESIGN_WIDTH;


  const sy =
    actualHeight /
    DESIGN_HEIGHT;


  /*
   * শুধু original YOUR TEXT area cover করবে
   */

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


// =====================================================
// HOME API
// =====================================================

app.get("/", async (req, res) => {

  try {

    const metadata =
      await sharp(
        TEMPLATE_PATH
      ).metadata();


    res.json({

      status: true,

      message:
        "Custom Banner Text API",

      font:
        FONT_FAMILY,

      template: {
        width: metadata.width,
        height: metadata.height
      },

      examples: {

        basic:
          "/api?effectName=MAHABUB",

        twoWords:
          "/api?effectName=MAHABUB%20BRO",

        longText:
          "/api?effectName=MR%20MAHABUB%20RAHMAN",

        customSize:
          "/api?effectName=MAHABUB%20BRO&fontSize=100",

        customColor:
          "/api?effectName=MAHABUB%20BRO&color=%2328999A",

        png:
          "/api?effectName=MAHABUB%20BRO&format=png"

      }

    });

  } catch (error) {

    res.status(500).json({

      status: false,

      error:
        error.message

    });

  }

});


// =====================================================
// MAIN IMAGE API
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


    // =================================================
    // GET TEXT
    // =================================================

    const userText =
      normalizeText(
        effectName ||
        text
      );


    if (!userText) {

      return res.status(400).json({

        status: false,

        error:
          "effectName is required",

        example:
          "/api?effectName=MAHABUB%20BRO"

      });

    }


    // =================================================
    // TEXT LIMIT
    // =================================================

    if (
      [...userText].length > 60
    ) {

      return res.status(400).json({

        status: false,

        error:
          "Maximum 60 characters allowed"

      });

    }


    // =================================================
    // GET TEMPLATE SIZE
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


    // =================================================
    // SCALE BASED ON ACTUAL TEMPLATE SIZE
    // =================================================

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
        userText,
        {
          fontSize,
          color
        }
      );


    // =================================================
    // SCALE TEXT LAYER
    // =================================================

    const scaledWidth =
      Math.max(
        1,
        Math.round(
          textLayer.width *
          scaleX
        )
      );


    const scaledHeight =
      Math.max(
        1,
        Math.round(
          textLayer.height *
          scaleY
        )
      );


    // =================================================
    // ROTATE TEXT
    // =================================================

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


    // =================================================
    // GET ROTATED SIZE
    // =================================================

    const rotatedMeta =
      await sharp(
        rotatedText
      ).metadata();


    if (
      !rotatedMeta.width ||
      !rotatedMeta.height
    ) {

      throw new Error(
        "Unable to read generated text"
      );

    }


    // =================================================
    // BANNER CENTER POSITION
    // =================================================

    const centerX =
      BANNER.centerX *
      scaleX;


    const centerY =
      BANNER.centerY *
      scaleY;


    /*
     * Rotated image-এর center ধরে
     * exact position calculate
     */

    let left =
      Math.round(
        centerX -
        rotatedMeta.width / 2 +
        BANNER.opticalOffsetX *
        scaleX
      );


    let top =
      Math.round(
        centerY -
        rotatedMeta.height / 2 +
        BANNER.opticalOffsetY *
        scaleY
      );


    // =================================================
    // SAFE BOUNDARY
    // =================================================

    left = Math.max(
      0,
      Math.min(
        left,
        imageWidth -
        rotatedMeta.width
      )
    );


    top = Math.max(
      0,
      Math.min(
        top,
        imageHeight -
        rotatedMeta.height
      )
    );


    // =================================================
    // COVER ORIGINAL TEXT
    // =================================================

    const bannerCover =
      createBannerCover(
        imageWidth,
        imageHeight
      );


    // =================================================
    // COMPOSITE
    // =================================================

    let image =
      sharp(
        TEMPLATE_PATH
      )

        .composite([

          /*
           * Cover original YOUR TEXT
           */

          {
            input:
              Buffer.from(
                bannerCover
              ),

            top: 0,
            left: 0
          },


          /*
           * New centered text
           */

          {
            input:
              rotatedText,

            left,
            top
          }

        ]);


    // =================================================
    // OPTIONAL RESIZE
    // =================================================

    const outputWidth =
      Number(w);

    const outputHeight =
      Number(h);


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
            ) &&
            outputHeight >= 100 &&
            outputHeight <= 4000

              ? Math.floor(
                  outputHeight
                )

              : undefined,

          fit:
            "cover"

        });

    }


    // =================================================
    // OUTPUT FORMAT
    // =================================================

    const outputFormat =
      String(
        format || "jpg"
      ).toLowerCase();


    res.setHeader(
      "Cache-Control",
      "no-store"
    );


    // PNG

    if (
      outputFormat === "png"
    ) {

      const buffer =
        await image
          .png()
          .toBuffer();


      res.type(
        "image/png"
      );


      return res.send(
        buffer
      );

    }


    // WEBP

    if (
      outputFormat === "webp"
    ) {

      const buffer =
        await image
          .webp({
            quality: 95
          })
          .toBuffer();


      res.type(
        "image/webp"
      );


      return res.send(
        buffer
      );

    }


    // JPG

    const buffer =
      await image
        .jpeg({
          quality: 96,
          mozjpeg: true
        })
        .toBuffer();


    res.type(
      "image/jpeg"
    );


    return res.send(
      buffer
    );


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
// START SERVER
// =====================================================

app.listen(
  PORT,
  () => {

    console.log(
      `✓ Server running on port ${PORT}`
    );

  }
);
