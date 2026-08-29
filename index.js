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
// ORIGINAL DESIGN SIZE
// =====================================================

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;


// =====================================================
// HIGH QUALITY TEXT RENDER SCALE
// =====================================================

// Text প্রথমে 3x quality-তে render হবে
const TEXT_SCALE = 3;


// =====================================================
// FONT
// =====================================================

let FONT_FAMILY = "Impact";

if (fs.existsSync(FONT_PATH)) {

  try {

    const loaded =
      GlobalFonts.registerFromPath(
        FONT_PATH,
        "BannerFont"
      );

    if (loaded) {

      FONT_FAMILY =
        "BannerFont";

      console.log(
        "✓ Custom font loaded successfully"
      );

    }

  } catch (error) {

    console.log(
      "Font load error:",
      error.message
    );

  }

}


// =====================================================
// BANNER SETTINGS
// =====================================================

const BANNER = {

  centerX: 1025,
  centerY: 530,

  maxWidth: 610,
  maxHeight: 145,

  angle: 19,

  opticalOffsetX: -3,

  // Text একটু নিচে
  opticalOffsetY: 8,

  shadowX: 5,
  shadowY: 7,

  padding: 35

};


// =====================================================
// COLOR
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
// GET FONT SIZE
// =====================================================

function getBestFontSize(
  text,
  requestedFontSize
) {

  const canvas =
    createCanvas(10, 10);

  const ctx =
    canvas.getContext("2d");


  let maxSize = 150;


  const customSize =
    Number(requestedFontSize);


  if (
    Number.isFinite(customSize) &&
    customSize >= 15 &&
    customSize <= 250
  ) {

    maxSize =
      customSize;

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
      width <= BANNER.maxWidth &&
      height <= BANNER.maxHeight
    ) {

      return size;

    }

  }


  return 15;

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


  const color =
    getSafeColor(
      options.color
    );


  // ---------------------------------------------
  // High resolution values
  // ---------------------------------------------

  const scale =
    TEXT_SCALE;


  const scaledFontSize =
    fontSize * scale;


  const measureCanvas =
    createCanvas(
      10,
      10
    );


  const measureCtx =
    measureCanvas.getContext("2d");


  measureCtx.font =
    `900 ${scaledFontSize}px "${FONT_FAMILY}"`;


  const metrics =
    measureCtx.measureText(
      text
    );


  const textWidth =
    Math.ceil(
      metrics.width
    );


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


  // ---------------------------------------------
  // Better rendering
  // ---------------------------------------------

  ctx.antialias =
    "subpixel";


  ctx.font =
    `900 ${scaledFontSize}px "${FONT_FAMILY}"`;


  ctx.textAlign =
    "center";


  ctx.textBaseline =
    "middle";


  const x =
    canvasWidth / 2 -
    shadowX / 2;


  const y =
    canvasHeight / 2 -
    shadowY / 2;


  // =================================================
  // HARD SHADOW
  // =================================================

  ctx.fillStyle =
    "#061718";


  ctx.strokeStyle =
    "#061718";


  ctx.lineWidth =
    Math.max(
      2.5 * scale,
      scaledFontSize * 0.03
    );


  ctx.lineJoin =
    "round";


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


  // =================================================
  // GRADIENT
  // =================================================

  const gradient =
    ctx.createLinearGradient(
      0,
      y - scaledFontSize / 2,
      0,
      y + scaledFontSize / 2
    );


  gradient.addColorStop(
    0,
    "#4DB5B4"
  );


  gradient.addColorStop(
    0.45,
    color
  );


  gradient.addColorStop(
    1,
    "#147678"
  );


  // =================================================
  // THICK SHARP OUTLINE
  // =================================================

  ctx.strokeStyle =
    "#07595B";


  ctx.lineWidth =
    Math.max(
      2.5 * scale,
      scaledFontSize * 0.028
    );


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

    // Real output size
    width:
      Math.round(
        canvasWidth / scale
      ),

    height:
      Math.round(
        canvasHeight / scale
      ),

    // Actual rendered size
    renderWidth:
      canvasWidth,

    renderHeight:
      canvasHeight,

    fontSize

  };

}


// =====================================================
// BANNER COVER
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
// HOME
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
        "High Quality Custom Banner API",

      font:
        FONT_FAMILY,

      template: {

        width:
          metadata.width,

        height:
          metadata.height

      },

      examples: {

        basic:
          "/api?effectName=MAHABUB",

        twoWords:
          "/api?effectName=MAHABUB%20BOT",

        png:
          "/api?effectName=MAHABUB%20BOT&format=png"

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
// MAIN API
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


    const userText =
      normalizeText(
        effectName ||
        text
      );


    if (!userText) {

      return res.status(400).json({

        status: false,

        error:
          "effectName is required"

      });

    }


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
    // TEMPLATE
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
    // TEXT LAYER
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
    // FINAL TEXT SIZE
    // =================================================

    /*
     * High resolution text layer থেকে
     * final banner scale calculate
     */

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
    // DOWNSCALE + ROTATE
    // =================================================

    const rotatedText =
      await sharp(
        textLayer.buffer
      )

        /*
         * এখানে high-res PNG
         * ভালো interpolation দিয়ে
         * final size-এ নামানো হচ্ছে
         */

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

        /*
         * খুব light sharpen
         */

        .sharpen({
          sigma: 0.5,
          m1: 0.3,
          m2: 2
        })

        .png()

        .toBuffer();


    const rotatedMeta =
      await sharp(
        rotatedText
      ).metadata();


    if (
      !rotatedMeta.width ||
      !rotatedMeta.height
    ) {

      throw new Error(
        "Unable to read text layer"
      );

    }


    // =================================================
    // POSITION
    // =================================================

    const centerX =
      BANNER.centerX *
      scaleX;


    const centerY =
      BANNER.centerY *
      scaleY;


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


    /*
     * Image boundary safety
     */

    left =
      Math.max(
        0,
        Math.min(
          left,
          imageWidth -
          rotatedMeta.width
        )
      );


    top =
      Math.max(
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

          {
            input:
              Buffer.from(
                bannerCover
              ),

            top: 0,
            left: 0
          },

          {
            input:
              rotatedText,
            left,
            top
          }

        ]);


    // =================================================
    // OUTPUT RESIZE
    // =================================================

    const outputWidth =
      Number(w);

    const outputHeight =
      Number(h);


    if (
      Number.isFinite(
        outputWidth
      ) &&
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
            "cover",

          kernel:
            sharp.kernel.lanczos3

        });

    }


    // =================================================
    // FORMAT
    // =================================================

    const outputFormat =
      String(
        format ||
        "jpg"
      )
        .toLowerCase();


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
          .png({
            compressionLevel: 6
          })
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
            quality: 98
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

          quality: 100,

          chromaSubsampling:
            "4:4:4"

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
// START
// =====================================================

app.listen(
  PORT,
  () => {

    console.log(
      `✓ Server running on port ${PORT}`
    );

  }
);
