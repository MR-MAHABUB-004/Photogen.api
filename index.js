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


// =====================================
// ORIGINAL TEMPLATE SIZE
// =====================================

const BASE_WIDTH = 1536;
const BASE_HEIGHT = 1024;


// =====================================
// XML ESCAPE
// =====================================

function escapeXML(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


// =====================================
// CREATE TEXT EFFECT
// =====================================

function createTextSVG(
  text,
  options = {}
) {
  const safeText = escapeXML(text);

  const textLength = [...text].length;

  // =====================================
  // AUTO FONT SIZE
  // =====================================

  let fontSize = 150;

  if (textLength >= 8) {
    fontSize = 135;
  }

  if (textLength >= 12) {
    fontSize = 115;
  }

  if (textLength >= 18) {
    fontSize = 95;
  }

  if (textLength >= 25) {
    fontSize = 75;
  }

  if (textLength >= 32) {
    fontSize = 60;
  }


  // User custom font size
  if (
    options.fontSize &&
    Number(options.fontSize) > 20
  ) {
    fontSize = Number(options.fontSize);
  }


  // =====================================
  // TEXT AREA
  // =====================================

  /*
    Banner-এর text বসানোর জায়গা

    x শুরু = 680
    x শেষ = 1370

    Safe text width = 590
  */

  const TEXT_CENTER_X = 1025;
  const TEXT_CENTER_Y = 540;

  const MAX_TEXT_WIDTH = 620;


  // =====================================
  // TEXT COLOR
  // =====================================

  const color =
    options.color || "#24b7b8";


  return `
  <svg
    width="${BASE_WIDTH}"
    height="${BASE_HEIGHT}"
    viewBox="0 0 ${BASE_WIDTH} ${BASE_HEIGHT}"
    xmlns="http://www.w3.org/2000/svg"
  >

    <defs>

      <!-- Text gradient -->
      <linearGradient
        id="textGradient"
        x1="0%"
        y1="0%"
        x2="100%"
        y2="100%"
      >

        <stop
          offset="0%"
          stop-color="${color}"
        />

        <stop
          offset="55%"
          stop-color="${color}"
        />

        <stop
          offset="100%"
          stop-color="#087f80"
        />

      </linearGradient>


      <!-- Text shadow -->

      <filter
        id="textShadow"
        x="-30%"
        y="-30%"
        width="160%"
        height="160%"
      >

        <feDropShadow
          dx="6"
          dy="10"
          stdDeviation="4"
          flood-color="#000000"
          flood-opacity="0.9"
        />

      </filter>


      <!-- Banner clip area -->

      <clipPath id="bannerClip">

        <polygon
          points="
            650,310
            1410,565
            1370,800
            620,590
          "
        />

      </clipPath>

    </defs>


    <!-- ================================= -->
    <!-- COVER ORIGINAL YOUR TEXT -->
    <!-- ================================= -->

    <polygon
      points="
        650,310
        1410,565
        1370,800
        620,590
      "
      fill="#0b0d0e"
    />


    <!-- ================================= -->
    <!-- CUSTOM TEXT -->
    <!-- ================================= -->

    <g
      clip-path="url(#bannerClip)"
    >

      <text

        x="${TEXT_CENTER_X}"
        y="${TEXT_CENTER_Y}"

        text-anchor="middle"

        dominant-baseline="middle"

        font-family="
          Arial Black,
          Arial,
          DejaVu Sans,
          sans-serif
        "

        font-size="${fontSize}"

        font-weight="900"

        letter-spacing="1"

        fill="url(#textGradient)"

        stroke="#073e40"

        stroke-width="2"

        paint-order="stroke fill"

        filter="url(#textShadow)"

        transform="
          rotate(
            19
            ${TEXT_CENTER_X}
            ${TEXT_CENTER_Y}
          )
        "

        textLength="${MAX_TEXT_WIDTH}"

        lengthAdjust="spacingAndGlyphs"

      >
        ${safeText}
      </text>

    </g>

  </svg>
  `;
}


// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {

  res.json({
    status: true,

    message: "Custom Text Effect API",

    usage: {
      basic:
        "/api?effectName=MAHABUB",

      fullText:
        "/api?effectName=MAHABUB%20BOT",

      customColor:
        "/api?effectName=MAHABUB&color=%23ff0000",

      customFont:
        "/api?effectName=MAHABUB&fontSize=130",

      customSize:
        "/api?effectName=MAHABUB&w=1920&h=1080"
    }
  });

});


// =====================================
// API
// =====================================

app.get("/api", async (req, res) => {

  try {

    const {
      effectName,
      text,
      color,
      fontSize,
      w,
      h,
      format
    } = req.query;


    // =====================================
    // GET TEXT
    // =====================================

    const userText = String(
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


    // =====================================
    // TEXT LIMIT
    // =====================================

    if ([...userText].length > 40) {

      return res.status(400).json({
        status: false,

        error:
          "Maximum 40 characters allowed"
      });

    }


    // =====================================
    // OUTPUT SIZE
    // =====================================

    let outputWidth =
      parseInt(w) || BASE_WIDTH;


    let outputHeight =
      parseInt(h) || null;


    // Limit width

    if (outputWidth < 300) {
      outputWidth = 300;
    }

    if (outputWidth > 3000) {
      outputWidth = 3000;
    }


    // =====================================
    // CREATE SVG
    // =====================================

    const svg = createTextSVG(
      userText,
      {
        color,
        fontSize
      }
    );


    // =====================================
    // GENERATE IMAGE
    // =====================================

    let image = sharp(
      TEMPLATE_PATH
    ).composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0
      }
    ]);


    // =====================================
    // RESIZE
    // =====================================

    if (outputHeight) {

      image = image.resize(
        outputWidth,
        outputHeight,
        {
          fit: "fill"
        }
      );

    } else {

      image = image.resize({
        width: outputWidth
      });

    }


    // =====================================
    // FORMAT
    // =====================================

    const imageFormat =
      String(
        format || "jpg"
      ).toLowerCase();


    res.setHeader(
      "Cache-Control",
      "public, max-age=3600"
    );


    // PNG

    if (imageFormat === "png") {

      res.type("png");

      const buffer = await image
        .png()
        .toBuffer();

      return res.send(buffer);

    }


    // WEBP

    if (imageFormat === "webp") {

      res.type("webp");

      const buffer = await image
        .webp({
          quality: 95
        })
        .toBuffer();

      return res.send(buffer);

    }


    // JPG

    res.type("jpeg");

    const buffer = await image
      .jpeg({
        quality: 95,
        mozjpeg: true
      })
      .toBuffer();


    return res.send(buffer);


  } catch (error) {

    console.error(error);

    return res.status(500).json({

      status: false,

      error:
        "Failed to generate image",

      message:
        error.message

    });

  }

});


// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
