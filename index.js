"use strict";

const express = require("express");
const sharp = require("sharp");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const TEMPLATE_PATH = path.join(
  __dirname,
  "assets",
  "template.jpg"
);


// ======================================================
// ORIGINAL DESIGN COORDINATES
// ======================================================

// তোমার original landscape design-এর coordinate system

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1024;


// ======================================================
// TEXT AREA
// ======================================================

const TEXT_X = 700;
const TEXT_Y = 500;

const MAX_TEXT_WIDTH = 580;


// ======================================================
// XML ESCAPE
// ======================================================

function escapeXML(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


// ======================================================
// FONT SIZE CALCULATOR
// ======================================================

function getFontSize(text, customFontSize) {

  const length = [...text].length;

  // Text যত বড় হবে font তত ছোট হবে

  let fontSize;

  if (length <= 5) {
    fontSize = 150;
  } else if (length <= 8) {
    fontSize = 125;
  } else if (length <= 12) {
    fontSize = 95;
  } else if (length <= 16) {
    fontSize = 75;
  } else if (length <= 22) {
    fontSize = 60;
  } else if (length <= 30) {
    fontSize = 48;
  } else if (length <= 40) {
    fontSize = 38;
  } else {
    fontSize = 30;
  }


  // User custom font size

  if (customFontSize) {

    const requested = Number(customFontSize);

    if (
      Number.isFinite(requested) &&
      requested >= 15 &&
      requested <= 200
    ) {
      fontSize = requested;
    }

  }

  return fontSize;
}


// ======================================================
// CREATE SVG
// ======================================================

function createTextSVG(
  text,
  actualWidth,
  actualHeight,
  options = {}
) {

  const safeText = escapeXML(text);

  const fontSize = getFontSize(
    text,
    options.fontSize
  );

  const color =
    options.color || "#24B8B9";


  /*
    IMPORTANT:

    SVG-এর width এবং height
    template image-এর actual size হবে।

    কিন্তু viewBox থাকবে original
    design coordinate অনুযায়ী।
  */

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${actualWidth}"
  height="${actualHeight}"
  viewBox="0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}"
  preserveAspectRatio="none"
>

  <defs>

    <linearGradient
      id="textGradient"
      x1="0"
      y1="0"
      x2="0"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="${color}"
      />

      <stop
        offset="100%"
        stop-color="#08787A"
      />

    </linearGradient>


    <filter
      id="shadow"
      x="-50%"
      y="-50%"
      width="200%"
      height="200%"
    >

      <feDropShadow
        dx="5"
        dy="9"
        stdDeviation="3"
        flood-color="#000000"
        flood-opacity="0.85"
      />

    </filter>


    <!-- Banner area -->

    <clipPath id="bannerClip">

      <polygon
        points="
          645,305
          1415,565
          1370,800
          615,590
        "
      />

    </clipPath>

  </defs>


  <!-- ============================================ -->
  <!-- OLD TEXT COVER -->
  <!-- ============================================ -->

  <polygon
    points="
      645,305
      1415,565
      1370,800
      615,590
    "
    fill="#0B0D0F"
  />


  <!-- ============================================ -->
  <!-- CUSTOM TEXT -->
  <!-- ============================================ -->

  <g clip-path="url(#bannerClip)">

    <text

      x="${TEXT_X}"
      y="${TEXT_Y}"

      font-family="
        Arial Black,
        Arial,
        DejaVu Sans,
        sans-serif
      "

      font-size="${fontSize}"

      font-weight="900"

      letter-spacing="0"

      fill="url(#textGradient)"

      stroke="#063F40"

      stroke-width="1.5"

      paint-order="stroke fill"

      filter="url(#shadow)"

      transform="
        rotate(
          19
          ${TEXT_X}
          ${TEXT_Y}
        )
      "

    >${safeText}</text>

  </g>

</svg>
`;
}


// ======================================================
// HOME
// ======================================================

app.get("/", async (req, res) => {

  try {

    const metadata =
      await sharp(TEMPLATE_PATH)
        .metadata();


    res.json({

      status: true,

      message:
        "Custom Text Effect API",

      template: {
        width: metadata.width,
        height: metadata.height
      },

      examples: {

        basic:
          "/api?effectName=MAHABUB",

        fullText:
          "/api?effectName=MAHABUB%20BOT",

        customFont:
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
      error: error.message
    });

  }

});


// ======================================================
// API
// ======================================================

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


    // ==================================================
    // USER TEXT
    // ==================================================

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


    // ==================================================
    // TEXT LIMIT
    // ==================================================

    if ([...userText].length > 50) {

      return res.status(400).json({

        status: false,

        error:
          "Maximum 50 characters allowed"

      });

    }


    // ==================================================
    // GET ACTUAL IMAGE SIZE
    // ==================================================

    const metadata =
      await sharp(TEMPLATE_PATH)
        .metadata();


    const actualWidth =
      metadata.width;


    const actualHeight =
      metadata.height;


    if (
      !actualWidth ||
      !actualHeight
    ) {

      throw new Error(
        "Could not detect template image size"
      );

    }


    // ==================================================
    // CREATE SVG SAME SIZE AS IMAGE
    // ==================================================

    const svg =
      createTextSVG(
        userText,
        actualWidth,
        actualHeight,
        {
          fontSize,
          color
        }
      );


    // ==================================================
    // CREATE BASE IMAGE
    // ==================================================

    let image =
      sharp(TEMPLATE_PATH);


    // ==================================================
    // COMPOSITE TEXT
    // ==================================================

    image =
      image.composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0
        }
      ]);


    // ==================================================
    // OPTIONAL RESIZE
    // ==================================================

    const outputWidth =
      parseInt(w);


    const outputHeight =
      parseInt(h);


    if (
      Number.isFinite(outputWidth) &&
      outputWidth >= 300 &&
      outputWidth <= 4000
    ) {

      if (
        Number.isFinite(outputHeight) &&
        outputHeight >= 300 &&
        outputHeight <= 4000
      ) {

        image =
          image.resize(
            outputWidth,
            outputHeight,
            {
              fit: "fill"
            }
          );

      } else {

        image =
          image.resize({
            width: outputWidth
          });

      }

    }


    // ==================================================
    // OUTPUT FORMAT
    // ==================================================

    const outputFormat =
      String(
        format || "jpg"
      ).toLowerCase();


    res.setHeader(
      "Cache-Control",
      "no-store"
    );


    // PNG

    if (outputFormat === "png") {

      const buffer =
        await image
          .png()
          .toBuffer();


      res.set(
        "Content-Type",
        "image/png"
      );

      return res.send(buffer);

    }


    // WEBP

    if (outputFormat === "webp") {

      const buffer =
        await image
          .webp({
            quality: 95
          })
          .toBuffer();


      res.set(
        "Content-Type",
        "image/webp"
      );

      return res.send(buffer);

    }


    // JPG DEFAULT

    const buffer =
      await image
        .jpeg({
          quality: 95
        })
        .toBuffer();


    res.set(
      "Content-Type",
      "image/jpeg"
    );


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


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
