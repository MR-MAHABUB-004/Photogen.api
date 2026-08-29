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

// Original image size
const BASE_WIDTH = 1536;
const BASE_HEIGHT = 1024;


// ======================================
// Helper: SVG safe text
// ======================================

function escapeXML(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


// ======================================
// Create SVG overlay
// ======================================

function createTextSVG(text) {
  const safeText = escapeXML(text);

  // Text length অনুযায়ী font size
  const length = [...text].length;

  let fontSize = 145;

  if (length > 8) fontSize = 125;
  if (length > 12) fontSize = 105;
  if (length > 18) fontSize = 80;
  if (length > 25) fontSize = 62;

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
        <stop offset="0%" stop-color="#1fa7a8"/>
        <stop offset="45%" stop-color="#37c9c2"/>
        <stop offset="100%" stop-color="#118c8f"/>
      </linearGradient>


      <!-- Shadow -->
      <filter
        id="shadow"
        x="-30%"
        y="-30%"
        width="160%"
        height="160%"
      >
        <feDropShadow
          dx="8"
          dy="12"
          stdDeviation="4"
          flood-color="#000000"
          flood-opacity="0.85"
        />
      </filter>


      <!-- Banner clipping -->
      <clipPath id="bannerClip">

        <polygon
          points="
            690,312
            1405,573
            1360,780
            635,590
          "
        />

      </clipPath>

    </defs>


    <!--
      পুরানো YOUR TEXT অংশ cover করা
      Banner-এর উপর dark overlay
    -->

    <polygon
      points="
        680,315
        1405,575
        1362,780
        635,590
      "
      fill="#111416"
      fill-opacity="0.82"
    />


    <!-- Text -->
    <g
      clip-path="url(#bannerClip)"
      filter="url(#shadow)"
    >

      <text

        x="705"
        y="510"

        font-family="
          Arial Black,
          DejaVu Sans,
          sans-serif
        "

        font-size="${fontSize}"

        font-weight="900"

        letter-spacing="2"

        fill="url(#textGradient)"

        stroke="#0b5f61"
        stroke-width="2"

        paint-order="stroke fill"

        transform="
          rotate(20 705 510)
          skewY(-1)
        "

      >
        ${safeText}
      </text>

    </g>

  </svg>
  `;
}


// ======================================
// API
// ======================================

app.get("/", (req, res) => {

  res.json({
    status: true,
    message: "Your Text Effect API",
    usage: "/api?effectName=YOUR_TEXT",
    example: "/api?effectName=MAHABUB"
  });

});


app.get("/api", async (req, res) => {

  try {

    let {
      effectName,
      text,
      w,
      h,
      format
    } = req.query;


    // effectName or text
    const userText = String(
      effectName || text || ""
    ).trim();


    // Validation
    if (!userText) {

      return res.status(400).json({
        status: false,
        error: "effectName is required",
        example: "/api?effectName=MAHABUB"
      });

    }


    // Max text length
    if ([...userText].length > 35) {

      return res.status(400).json({
        status: false,
        error: "Maximum 35 characters allowed"
      });

    }


    // Output width
    let outputWidth = parseInt(w) || BASE_WIDTH;

    // Security limit
    if (outputWidth < 300) outputWidth = 300;
    if (outputWidth > 3000) outputWidth = 3000;


    // যদি h দেওয়া হয়
    let outputHeight = h
      ? parseInt(h)
      : null;


    if (
      outputHeight &&
      (
        outputHeight < 300 ||
        outputHeight > 3000
      )
    ) {
      outputHeight = null;
    }


    // Create SVG
    const svg = createTextSVG(userText);


    // Base image + text
    let image = sharp(TEMPLATE_PATH)
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0
        }
      ]);


    // Resize
    if (outputHeight) {

      image = image.resize(
        outputWidth,
        outputHeight,
        {
          fit: "cover",
          position: "center"
        }
      );

    } else {

      image = image.resize({
        width: outputWidth
      });

    }


    // Format
    format = String(
      format || "jpg"
    ).toLowerCase();


    // Response headers
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600"
    );


    // PNG
    if (format === "png") {

      res.type("png");

      const buffer = await image
        .png({
          compressionLevel: 9
        })
        .toBuffer();

      return res.send(buffer);

    }


    // WEBP
    if (format === "webp") {

      res.type("webp");

      const buffer = await image
        .webp({
          quality: 90
        })
        .toBuffer();

      return res.send(buffer);

    }


    // Default JPG
    res.type("jpeg");

    const buffer = await image
      .jpeg({
        quality: 92,
        mozjpeg: true
      })
      .toBuffer();


    return res.send(buffer);


  } catch (error) {

    console.error(
      "API ERROR:",
      error
    );

    return res.status(500).json({
      status: false,
      error: "Failed to generate image"
    });

  }

});


// ======================================
// Start server
// ======================================

app.listen(PORT, () => {

  console.log(
    `API running on port ${PORT}`
  );

});
