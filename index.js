// ================================
// NÖBETÇİ ECZANE BACKEND (PRODUCTION READY)
// ONE-CLICK DEPLOY (Render / Railway)
// ================================

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ================================
// CONFIG
// ================================
const BASE_URL = "https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/index.php";
const TOKEN = process.env.TOKEN || "497a346e4545652b356d72364e773d3d";

// simple in-memory cache (Render free tier friendly)
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

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

// ================================
// EXTERNAL API CALL
// ================================
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

// ================================
// ROUTES
// ================================

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get district pharmacies
app.get("/api/pharmacies/:district", async (req, res) => {
  try {
    const district = req.params.district;

    const cacheKey = `district_${district}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const data = await fetchPharmacies(district);

    setCache(cacheKey, data);

    res.json({
      success: true,
      source: "cache-or-live",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// City endpoint (optional)
app.get("/api/city/:city", async (req, res) => {
  try {
    const city = req.params.city;

    const response = await axios.post(
      BASE_URL,
      new URLSearchParams({
        jx: "1",
        islem: "get_il_eczane",
        il: city,
        h: TOKEN,
      })
    );

    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eczane API running on port ${PORT}`);
});

// ================================
// PACKAGE.JSON (for deploy)
// ================================
/*
{
  "name": "eczane-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  }
}
*/

// ================================
// RENDER DEPLOY INSTRUCTIONS
// ================================
/*
1. GitHub repo oluştur
2. Bu dosyayı index.js olarak koy
3. package.json ekle
4. Render.com aç
5. New Web Service
6. GitHub repo seç
7. Settings:
   - Build Command: npm install
   - Start Command: npm start
8. Deploy
*/
