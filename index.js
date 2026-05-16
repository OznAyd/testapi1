const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const BASE_URL =
  "https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/index.php";

const TOKEN = process.env.TOKEN || "497a346e4545652b356d72364e773d3d";

// cache
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6;

// cache helpers
function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

// Türkçe normalize
function normalize(text) {
  if (!text) return "";

  return decodeURIComponent(text)
    .trim()
    .toLowerCase()
    .replace(/i̇/g, "i")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g");
}

// external API
async function fetchPharmacies(district) {
  const response = await axios.post(
    BASE_URL,
    new URLSearchParams({
      jx: "1",
      islem: "get_ilce_eczane",
      ilce: district,
      h: TOKEN,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  return response.data;
}

// ========================
// HEALTH
// ========================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ========================
// MAIN API (TEK ROUTE)
// ========================
app.get("/api/pharmacies", async (req, res) => {
  try {
    let district = req.query.district;

    if (!district) {
      return res.status(400).json({
        success: false,
        message: "district required",
      });
    }

    district = decodeURIComponent(district);

    const key = normalize(district);
    const cached = getCache(key);

    if (cached) {
      return res.json({
        success: true,
        source: "cache",
        data: cached,
      });
    }

    const data = await fetchPharmacies(district);

    setCache(key, data);

    return res.json({
      success: true,
      source: "live",
      data,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Eczane API running on port", PORT);
});
