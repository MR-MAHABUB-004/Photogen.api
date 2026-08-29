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

/*
  তোমার original image-এর coordinate system
*/

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;


// =====================================================
// LOAD CUSTOM FONT
// =====================================================

let FONT_FAMILY = "Impact";

if (fs.existsSync(FONT_PATH)) {

  const loaded = GlobalFonts.registerFromPath(
    FONT_PATH,
    "OriginalEffectFont"
  );

  if (loaded) {
    FONT_FAMILY = "OriginalEffectFont";
    console.log("Custom font loaded successfully");
  }

} else {

  console.log(
    "font.ttf not found. Using Impact fallback."
  );

}


// =====================================================
// BANNER SETTINGS
// =====================================================

/*
  IMPORTANT:

  এই values original 1536x1024 image-এর
  banner অনুযায়ী রাখা হয়েছে।
*/


const BANNER = {

  /*
    Text-এর center
  */

  centerX: 1030,
  centerY: 530,


  /*
    Text-এর সর্বোচ্চ safe width

    এখানে বেশি দিলে text banner-এর বাইরে যেতে পারে।
  */

  maxWidth: 590,


  /*
    Banner-এর safe text height
  */

  maxHeight: 150,


  /*
    Banner-এর angle
  */

  angle: 19
};


// =====================================================
// VALIDATE COLOR
// =====================================================

function getSafeColor(color) {

  if (!color) {
    return "#36B9B6";
  }

  const value =
    String(color).trim();

  if (
    /^#[0-9A-Fa-f]{6}$/.test(value)
  ) {
    return value;
  }

  return "#36B9B6";
}


// =====================================================
// GET ACTUAL BEST FONT SIZE
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
    Maximum font size
  */

  let maxSize = 150;


  /*
    User custom size
  */

  if (requestedFontSize) {

    const custom =
      Number(requestedFontSize);

    if (
      Number.isFinite(custom) &&
      custom >= 15 &&
      custom <= 250
    ) {

      maxSize = custom;

    }

  }


  /*
    বড় থেকে ছোট font check করা হবে
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


    /*
      Actual text width
    */

    const textWidth =
      metrics.width;


    /*
      Actual text height
    */

    const textHeight =
      (
        metrics.actualBoundingBoxAscent ||
        size
      )
      +
      (
        metrics.actualBoundingBoxDescent ||
        0
      );


    /*
      Safe area-এর মধ্যে থাকলে
      এই size ব্যবহার করবো
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
// CREATE TEXT IMAGE
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


  /*
    প্রথমে text measure
  */

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
      (
        metrics.actualBoundingBoxAscent ||
        fontSize
      )
      +
      (
        metrics.actualBoundingBoxDescent ||
        fontSize * 0.2
      )
    );


  /*
    Shadow-এর জন্য padding
  */

  const padding = 30;


  const canvasWidth =
    textWidth +
    padding * 2;


  const canvasHeight =
    textHeight +
    padding * 2;


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
  // DARK EXTRUSION
  // =================================================

  /*
    Original image-এর মতো
    নিচে hard dark shadow
  */

  ctx.fillStyle =
    "#07191A";

  ctx.strokeStyle =
    "#07191A";

  ctx.lineWidth =
    Math.max(
      3,
      fontSize * 0.035
    );


  /*
    কয়েকবার নিচে আঁকা
    যাতে 3D/extrusion feel আসে
  */

  for (
    let i = 10;
    i >= 3;
    i--
  ) {

    ctx.strokeText(
      text,
      x + i * 0.7,
      y + i
    );

    ctx.fillText(
      text,
      x + i * 0.7,
      y + i
    );

  }


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
    Original-এর কাছাকাছি cyan style
  */

  gradient.addColorStop(
    0,
    "#53CFCA"
  );

  gradient.addColorStop(
    0.35,
    color
  );

  gradient.addColorStop(
    0.75,
    "#1A9A9A"
  );

  gradient.addColorStop(
    1,
    "#08777A"
  );


  // =================================================
  // OUTLINE
  // =================================================

  ctx.strokeStyle =
    "#07595B";

  ctx.lineWidth =
    Math.max(
      1.5,
      fontSize * 0.02
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

    width:
      canvasWidth,

    height:
      canvasHeight,

    fontSize

  };

}


// =====================================================
// CREATE BANNER OVERLAY
// =====================================================

function createBannerCover(
  actualWidth,
  actualHeight
) {

  /*
    Actual image size-এর জন্য
    original coordinates scale করা হচ্ছে
  */

  const sx =
    actualWidth /
    DESIGN_WIDTH;


  const sy =
    actualHeight /
    DESIGN_HEIGHT;


  /*
    শুধু original YOUR TEXT area cover
  */

  const points = [

    [650, 315],
    [1400, 560],
    [1365, 775],
    [620, 590]

  ];


  const scaled =
    points.map(
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
    points="${scaled}"
    fill="#111315"
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
        "Custom Text Effect API",

      font: FONT_FAMILY,

      template: {

        width:
          metadata.width,

        height:
          metadata.height

      },

      examples: {

        basic:
          "/api?effectName=MAHABUB",

        fullText:
          "/api?effectName=MAHABUB%20BOT",

        customFontSize:
          "/api?effectName=MAHABUB%20BOT&fontSize=60",

        customColor:
          "/api?effectName=MAHABUB&color=%23ff0000",

        png:
          "/api?effectName=MAHABUB&format=png"

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
      w,
      h,
      format
    } = req.query;


    // =================================================
    // GET TEXT
    // =================================================

    const userText =
      String(
        effectName ||
        text ||
        ""
      ).trim();


    if (!userText) {

      return res.status(400).json({

        status: false,

        error:
          "effectName is required",

        example:
          "/api?effectName=MAHABUB%20BOT"

      });

    }


    // =================================================
    // MAX LENGTH
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
        "Template image dimensions not found"
      );

    }


    // =================================================
    // SCALE
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

    const scaledTextWidth =
      Math.max(
        1,
        Math.round(
          textLayer.width *
          scaleX
        )
      );


    const scaledTextHeight =
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
          scaledTextWidth,
          scaledTextHeight
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


    // =================================================
    // CALCULATE CENTER POSITION
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
        rotatedMeta.width / 2
      );


    let top =
      Math.round(
        centerY -
        rotatedMeta.height / 2
      );


    // =================================================
    // SAFE IMAGE BOUNDARY
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
    // OPTIONAL OUTPUT SIZE
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
    // FORMAT
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
          quality: 95,
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
      "API ERROR:",
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
      `Server running on port ${PORT}`
    );

  }
);
