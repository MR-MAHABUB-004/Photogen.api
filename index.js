"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;


// =====================================================
// AUTO LOAD ALL EFFECTS
// =====================================================

const EFFECTS_DIR = path.join(__dirname, "effects");

function loadEffects() {
  const effects = {};

  if (!fs.existsSync(EFFECTS_DIR)) {
    console.warn("⚠ effects folder not found");
    return effects;
  }

  const files = fs.readdirSync(EFFECTS_DIR);

  for (const file of files) {
    // শুধু .js file load করবে
    if (!file.endsWith(".js")) continue;

    // shadow.js → shadow
    const effectName = path.basename(file, ".js").toLowerCase();

    try {
      const effectPath = path.join(EFFECTS_DIR, file);

      effects[effectName] = require(effectPath);

      console.log(`✓ Effect loaded: ${effectName}`);
    } catch (error) {
      console.error(
        `✗ Failed to load effect "${effectName}":`,
        error.message
      );
    }
  }

  return effects;
}


// =====================================================
// LOAD EFFECTS ON STARTUP
// =====================================================

const effects = loadEffects();


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "Text Effect API",

    availableEffects: Object.keys(effects),

    usage: {
      shadow: "/api?effect=shadow&effectName=MAHABUB",
      custom: "/api?effect=EFFECT_NAME&effectName=YOUR_TEXT"
    }
  });
});


// =====================================================
// MAIN API
// =====================================================

app.get("/api", async (req, res) => {
  try {
    const {
      effect,
      effectName,
      text,
      fontSize,
      color,
      format,
      w,
      h
    } = req.query;


    // Default effect
    const selectedEffectName = String(
      effect || "shadow"
    )
      .toLowerCase()
      .trim();


    const selectedEffect =
      effects[selectedEffectName];


    if (!selectedEffect) {
      return res.status(404).json({
        status: false,

        error: "Effect not found",

        requestedEffect: selectedEffectName,

        availableEffects: Object.keys(effects)
      });
    }


    const userText = String(
      effectName ||
      text ||
      ""
    )
      .trim();


    if (!userText) {
      return res.status(400).json({
        status: false,
        error: "effectName is required",

        example:
          `/api?effect=${selectedEffectName}&effectName=MAHABUB`
      });
    }


    if ([...userText].length > 60) {
      return res.status(400).json({
        status: false,
        error: "Maximum 60 characters allowed"
      });
    }


    // Generate effect image
    const buffer = await selectedEffect.generate(
      userText,
      {
        fontSize,
        color,
        format,
        width: w,
        height: h
      }
    );


    const outputFormat = String(
      format || "jpg"
    ).toLowerCase();


    res.setHeader(
      "Cache-Control",
      "no-store"
    );


    if (outputFormat === "png") {
      res.type("image/png");

    } else if (outputFormat === "webp") {
      res.type("image/webp");

    } else {
      res.type("image/jpeg");
    }


    return res.send(buffer);

  } catch (error) {
    console.error("API ERROR:", error);

    return res.status(500).json({
      status: false,
      error: "Failed to generate image",
      message: error.message
    });
  }
});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);

  console.log(
    `✓ Loaded effects: ${
      Object.keys(effects).join(", ") || "none"
    }`
  );
});
