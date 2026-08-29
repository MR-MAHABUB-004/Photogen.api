"use strict";

const express = require("express");
const sharp = require("sharp");
const path = require("path");

const {
  createCanvas,
  GlobalFonts
} = require("@napi-rs/canvas");

const app = express();

const PORT = process.env.PORT || 3000;

const TEMPLATE_PATH = path.join(
  __dirname,
  "assets",
  "template.jpg"
);


// =====================================================
// DESIGN SIZE
// =====================================================

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;


// =====================================================
// FONT
// =====================================================

/*
  চাইলে assets/font.ttf রাখবে।

  Original-এর মতো exact font চাইলে
  এখানে সেই font file দিতে হবে।
*/

const FONT_PATH = path.join(
  __dirname,
  "assets",
  "font.ttf"
);

try {

  GlobalFonts.registerFromPath(
    FONT_PATH,
    "EffectFont"
  );

  console.log("Custom font loaded");

} catch (error) {

  console.log(
    "Custom font not found, using fallback font"
  );

}


// =====================================================
// BANNER TEXT SETTINGS
// =====================================================

const TEXT_CENTER_X = 1030;
const TEXT_CENTER_Y = 545;

const TEXT_ANGLE = 19;


/*
  Banner-এর মধ্যে text-এর জন্য
  safe maximum width
*/

const MAX_TEXT_WIDTH = 610;


/*
  ছোট margin
*/

const SIDE_PADDING = 40;


// =====================================================
// COLOR VALIDATION
// =====================================================

function getSafeColor(color) {

  const defaultColor = "#31B6B5";

  if (!color) {
    return defaultColor;
  }

  const value = String(color).trim();

  if (
    /^#[0-9a-fA-F]{6}$/.test(value)
  ) {
    return value;
  }

  return defaultColor;
}


// =====================================================
// GET PERFECT FONT SIZE
// =====================================================

function getBestFontSize(
  text,
  requestedFontSize
) {

  const canvas =
    createCanvas(10, 10);

  const ctx =
    canvas.getContext("2d");


  const fontFamily =
    "EffectFont, Arial Black, Arial";


  /*
    User custom font size দিলে
    সেটাকে maximum হিসেবে ব্যবহার করবে।

    কিন্তু text কাটার chance থাকলে
    automatically ছোট হবে।
  */

  let maxSize = 150;

  if (requestedFontSize) {

    const requested =
      Number(requestedFontSize);

    if (
      Number.isFinite(requested) &&
      requested >= 20 &&
      requested <= 250
    ) {

      maxSize = requested;

    }

  }


  const availableWidth =
    MAX_TEXT_WIDTH - SIDE_PADDING;


  /*
    বড় থেকে ছোট font test করা
  */

  for (
    let size = maxSize;
    size >= 20;
    size--
  ) {

    ctx.font =
      `900 ${size}px ${fontFamily}`;


    const metrics =
      ctx.measureText(text);


    const width =
      metrics.width;


    if (
      width <= availableWidth
    ) {

      return size;

    }

  }


  return 20;
}


// =====================================================
// CREATE TEXT PNG
// =====================================================

function createTextImage(
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


  const canvasWidth =
    MAX_TEXT_WIDTH + 100;


  const canvasHeight =
    300;


  const canvas =
    createCanvas(
      canvasWidth,
      canvasHeight
    );


  const ctx =
    canvas.getContext("2d");


  const fontFamily =
    "EffectFont, Arial Black, Arial";


  ctx.font =
    `900 ${fontSize}px ${fontFamily}`;


  ctx.textAlign = "center";

  ctx.textBaseline = "middle";


  // =================================================
  // SHADOW
  // =================================================

  ctx.shadowColor =
    "rgba(0, 0, 0, 0.90)";

  ctx.shadowBlur = 5;

  ctx.shadowOffsetX = 7;

  ctx.shadowOffsetY = 10;


  // =================================================
  // ORIGINAL-LIKE GRADIENT
  // =================================================

  const gradient =
    ctx.createLinearGradient(
      0,
      50,
      0,
      230
    );


  gradient.addColorStop(
    0,
    color
  );

  gradient.addColorStop(
    0.55,
    "#2AAEAD"
  );

  gradient.addColorStop(
    1,
    "#087C7E"
  );


  ctx.fillStyle =
    gradient;


  // =================================================
  // TEXT STROKE
  // =================================================

  ctx.strokeStyle =
    "#07595B";

  ctx.lineWidth =
    Math.max(
      1.5,
      fontSize * 0.018
    );


  const x =
    canvasWidth / 2;


  const y =
    canvasHeight / 2;


  ctx.strokeText(
    text,
    x,
    y
  );


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
// API HOME
// =====================================================

app.get("/", async (req, res) => {

  try {

    const metadata =
      await sharp(TEMPLATE_PATH)
        .metadata();


    res.json({

      status: true,

      name:
        "Custom Text Effect API",

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

        customSize:
          "/api?effectName=MAHABUB%20BOT&fontSize=70",

        customColor:
          "/api?effectName=MAHABUB&color=%23ff0000"

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


    // ===============================================
    // GET TEXT
    // ===============================================

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


    // ===============================================
    // GET TEMPLATE METADATA
    // ===============================================

    const metadata =
      await sharp(TEMPLATE_PATH)
        .metadata();


    if (
      !metadata.width ||
      !metadata.height
    ) {

      throw new Error(
        "Template image size not found"
      );

    }


    // ===============================================
    // SCALE FOR DIFFERENT TEMPLATE SIZE
    // ===============================================

    const scaleX =
      metadata.width /
      DESIGN_WIDTH;


    const scaleY =
      metadata.height /
      DESIGN_HEIGHT;


    // ===============================================
    // CREATE TEXT IMAGE
    // ===============================================

    const textData =
      createTextImage(
        userText,
        {
          fontSize,
          color
        }
      );


    // ===============================================
    // SCALE TEXT
    // ===============================================

    const scaledTextWidth =
      Math.round(
        textData.width *
        scaleX
      );


    const scaledTextHeight =
      Math.round(
        textData.height *
        scaleY
      );


    // ===============================================
    // ROTATE TEXT
    // ===============================================

    const rotatedText =
      await sharp(
        textData.buffer
      )

        .resize(
          scaledTextWidth,
          scaledTextHeight
        )

        .rotate(
          TEXT_ANGLE,
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


    // ===============================================
    // GET ROTATED TEXT SIZE
    // ===============================================

    const rotatedMetadata =
      await sharp(
        rotatedText
      ).metadata();


    // ===============================================
    // CENTER TEXT ON BANNER
    // ===============================================

    let left =
      Math.round(
        TEXT_CENTER_X *
        scaleX -
        rotatedMetadata.width / 2
      );


    let top =
      Math.round(
        TEXT_CENTER_Y *
        scaleY -
        rotatedMetadata.height / 2
      );


    /*
      Clamp position

      যাতে কোনো অবস্থাতেই
      image-এর বাইরে না যায়
    */

    left = Math.max(
      0,
      Math.min(
        left,
        metadata.width -
        rotatedMetadata.width
      )
    );


    top = Math.max(
      0,
      Math.min(
        top,
        metadata.height -
        rotatedMetadata.height
      )
    );


    // ===============================================
    // CREATE FINAL IMAGE
    // ===============================================

    let image =
      sharp(TEMPLATE_PATH)

        .composite([

          {
            input:
              rotatedText,

            left,

            top
          }

        ]);


    // ===============================================
    // OPTIONAL RESIZE
    // ===============================================

    const outputWidth =
      Number(w);


    const outputHeight =
      Number(h);


    if (
      Number.isFinite(outputWidth) &&
      outputWidth > 0
    ) {

      image =
        image.resize(
          Math.min(
            outputWidth,
            4000
          ),

          Number.isFinite(outputHeight) &&
          outputHeight > 0
            ? Math.min(
                outputHeight,
                4000
              )
            : undefined,

          {
            fit: "cover"
          }
        );

    }


    // ===============================================
    // OUTPUT FORMAT
    // ===============================================

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


      res.type("png");

      return res.send(buffer);

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


      res.type("webp");

      return res.send(buffer);

    }


    // JPG

    const buffer =
      await image
        .jpeg({
          quality: 95
        })
        .toBuffer();


    res.type("jpeg");

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
// START SERVER
// =====================================================

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
