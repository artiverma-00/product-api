require("dotenv/config");

function ensureDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const databaseName =
    process.env.MONGODB_DATABASE || process.env.DATABASE_NAME || "product_api";
  const url = new URL(rawUrl);

  if (url.protocol.startsWith("mongodb") && (!url.pathname || url.pathname === "/")) {
    url.pathname = `/${databaseName}`;
    process.env.DATABASE_URL = url.toString();
  }

  return process.env.DATABASE_URL;
}

module.exports = {
  ensureDatabaseUrl,
};
