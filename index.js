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
// TEMPLATE SIZE
// ======================================================

const BASE_WIDTH = 1536;
const BASE_HEIGHT = 1024;


// ======================================================
// BANNER TEXT SAFE AREA
// ======================================================

/*
    Text-এর জন্য banner-এর safe জায়গা।

    একটু margin রাখা হয়েছে যাতে
    বড় text-ও ডান পাশে কেটে না যায়।
*/

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
// CALCULATE PERFECT FONT SIZE
// ======================================================

function getFontSize(text, customFontSize) {

  const length = [...text].length;

  /*
      Arial Black / bold font-এর average
      character width roughly 0.75 × font size।

      Safe width = 580px
  */

  const estimatedWidthPerChar = 0.78;

  let calculatedSize =
    MAX_TEXT_WIDTH /
    Math.max(length * estimatedWidthPerChar, 1);


  // Maximum size
  calculatedSize = Math.min(
    calculatedSize,
    150
  );


  // Minimum size
  calculatedSize = Math.max(
    calculatedSize,
    32
  );


  /*
      User fontSize দিলে সেটাও নেওয়া হবে।

      কিন্তু যদি font বড় হওয়ার কারণে
      text cut হওয়ার chance থাকে,
      automatically safe size ব্যবহার হবে।
  */

  if (customFontSize) {

    const requestedSize =
      Number(customFontSize);


    if (
      Number.isFinite(requestedSize) &&
      requestedSize >= 20
    ) {

      calculatedSize = Math.min(
        requestedSize,
        calculatedSize
      );

    }

  }


  return Math.floor(
    calculatedSize
  );
}


// ======================================================
// CREATE SVG
// ======================================================

function createTextSVG(
  text,
  options = {}
) {

  const safeText =
    escapeXML(text);


  const fontSize =
    getFontSize(
      text,
      options.fontSize
    );


  const color =
    options.color ||
    "#24B8B9";


  return `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${BASE_WIDTH}"
    height="${BASE_HEIGHT}"
    viewBox="0 0 ${BASE_WIDTH} ${BASE_HEIGHT}"
  >

    <defs>

      <!-- Gradient -->

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


      <!-- Shadow -->

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

    </defs>


    <!-- ============================================ -->
    <!-- COVER OLD TEXT AREA -->
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

    >

      ${safeText}

    </text>

  </svg>
  `;
}


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

  res.json({

    status: true,

    name:
      "Custom Text Effect API",

    examples: {

      basic:
        "/api?effectName=MAHABUB",

      fullText:
        "/api?effectName=MAHABUB%20BOT",

      longText:
        "/api?effectName=MR%20MAHABUB%20RAHMAN",

      customFont:
        "/api?effectName=MAHABUB%20BOT&fontSize=50",

      customColor:
        "/api?effectName=MAHABUB%20BOT&color=%23ff0000",

      png:
        "/api?effectName=MAHABUB%20BOT&format=png"

    }

  });

});


// ======================================================
// IMAGE API
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
    // GET USER TEXT
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
          "effectName is required",

        example:
          "/api?effectName=MAHABUB%20BOT"

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
    // CREATE TEXT OVERLAY
    // ==================================================

    const svg =
      createTextSVG(
        userText,
        {
          fontSize,
          color
        }
      );


    // ==================================================
    // CREATE IMAGE
    // ==================================================

    let image =
      sharp(TEMPLATE_PATH)
        .composite([
          {
            input:
              Buffer.from(svg),

            top: 0,

            left: 0
          }
        ]);


    // ==================================================
    // RESIZE
    // ==================================================

    let outputWidth =
      parseInt(w);


    let outputHeight =
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
              fit: "cover"
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
    // RESPONSE FORMAT
    // ==================================================

    const outputFormat =
      String(
        format || "jpg"
      ).toLowerCase();


    res.setHeader(
      "Cache-Control",
      "public, max-age=3600"
    );


    // PNG

    if (outputFormat === "png") {

      const buffer =
        await image
          .png()
          .toBuffer();


      res.type("png");

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


      res.type("webp");

      return res.send(buffer);

    }


    // JPG DEFAULT

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


// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});
