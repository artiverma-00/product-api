const { ensureDatabaseUrl } = require("../lib/databaseUrl");

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

ensureDatabaseUrl();

const prisma = new PrismaClient();

const TOTAL_PRODUCTS = Number.parseInt(
  process.env.SEED_PRODUCT_COUNT || "200000",
  10,
);
const BATCH_SIZE = Number.parseInt(process.env.SEED_BATCH_SIZE || "10000", 10);
const RESET_PRODUCTS = process.env.RESET_PRODUCTS === "true";
const CATEGORY_COUNT = 8;
const MINUTES_BETWEEN_PRODUCTS = Number.parseInt(
  process.env.SEED_MINUTES_BETWEEN_PRODUCTS || "15",
  10,
);

const categories = [
  "Electronics",
  "Books",
  "Sports",
  "Fashion",
  "Furniture",
  "Home",
  "Beauty",
  "Toys",
];

function createRunIdPrefix() {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const random = crypto.randomBytes(4).toString("hex");

  return `${timestamp}${random}`;
}

function objectIdFromNumber(runIdPrefix, value) {
  return `${runIdPrefix}${value.toString(16).padStart(8, "0")}`;
}

function buildProductsBatch(offset, count, createdAt, runIdPrefix) {
  const products = new Array(count);

  for (let index = 0; index < count; index += 1) {
    const productNumber = offset + index + 1;
    const productCreatedAt = new Date(
      createdAt.getTime() -
        (TOTAL_PRODUCTS - productNumber) * MINUTES_BETWEEN_PRODUCTS * 60 * 1000,
    );

    products[index] = {
      id: objectIdFromNumber(runIdPrefix, productNumber),
      name: `Product ${productNumber}`,
      category: categories[productNumber % CATEGORY_COUNT],
      price: Number(((productNumber % 1000) + 0.99).toFixed(2)),
      createdAt: productCreatedAt,
      updatedAt: productCreatedAt,
    };
  }

  return products;
}

async function main() {
  if (!Number.isInteger(TOTAL_PRODUCTS) || TOTAL_PRODUCTS <= 0) {
    throw new Error("SEED_PRODUCT_COUNT must be a positive integer.");
  }

  if (!Number.isInteger(BATCH_SIZE) || BATCH_SIZE <= 0) {
    throw new Error("SEED_BATCH_SIZE must be a positive integer.");
  }

  if (
    !Number.isInteger(MINUTES_BETWEEN_PRODUCTS) ||
    MINUTES_BETWEEN_PRODUCTS <= 0
  ) {
    throw new Error(
      "SEED_MINUTES_BETWEEN_PRODUCTS must be a positive integer.",
    );
  }

  const createdAt = new Date();
  const runIdPrefix = createRunIdPrefix();

  if (RESET_PRODUCTS) {
    await prisma.product.deleteMany();
    console.log("Deleted existing products.");
  }

  console.time("seed-products");

  for (let offset = 0; offset < TOTAL_PRODUCTS; offset += BATCH_SIZE) {
    const count = Math.min(BATCH_SIZE, TOTAL_PRODUCTS - offset);
    const products = buildProductsBatch(offset, count, createdAt, runIdPrefix);

    await prisma.product.createMany({
      data: products,
    });

    console.log(`Inserted ${offset + products.length} of ${TOTAL_PRODUCTS}`);
  }

  console.timeEnd("seed-products");
  console.log(`Seeded ${TOTAL_PRODUCTS} products.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
