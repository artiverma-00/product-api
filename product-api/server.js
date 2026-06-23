const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

function normalizeOrigin(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).origin;
  } catch (error) {
    return trimmed.replace(/\/$/, "");
  }
}

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "https://product-api-one-gules.vercel.app",
];

const allowedOrigins = new Set(
  [process.env.FRONTEND_ORIGIN, ...defaultAllowedOrigins]
    .flatMap((value) => String(value || "").split(","))
    .map(normalizeOrigin)
    .filter(Boolean),
);

app.use(express.json());

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

const productRoutes = require("./routes/productRoutes");

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "product-api",
  });
});

app.use("/products", productRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
