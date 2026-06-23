const { ensureDatabaseUrl } = require("../lib/databaseUrl");

const { PrismaClient } = require("@prisma/client");

ensureDatabaseUrl();

const prisma = new PrismaClient();

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

function encodeCursor(product) {
  return Buffer.from(
    JSON.stringify({
      createdAt: product.createdAt.toISOString(),
      id: product.id,
    }),
  ).toString("base64url");
}

function decodeCursor(cursor) {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    const createdAt = new Date(parsed.createdAt);

    if (!parsed.id || Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return {
      id: String(parsed.id),
      createdAt,
    };
  } catch (error) {
    return null;
  }
}

function buildWhereClause(query, cursor) {
  const where = {};

  const categories = Array.isArray(query.category)
    ? query.category.map(String).filter(Boolean)
    : query.category
      ? [String(query.category)]
      : [];

  if (categories.length > 0) {
    where.category = {
      in: categories,
    };
  }

  const minPrice = Number.parseFloat(query.minPrice);
  const maxPrice = Number.parseFloat(query.maxPrice);

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    where.price = {};

    if (Number.isFinite(minPrice)) {
      where.price.gte = minPrice;
    }

    if (Number.isFinite(maxPrice)) {
      where.price.lte = maxPrice;
    }
  }

  if (cursor) {
    where.OR = [
      {
        createdAt: {
          lt: cursor.createdAt,
        },
      },
      {
        createdAt: cursor.createdAt,
        id: {
          lt: cursor.id,
        },
      },
    ];
  }

  return where;
}

const getProducts = async (req, res) => {
  const limitValue = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(limitValue)
    ? Math.min(Math.max(limitValue, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = req.query.cursor ? decodeCursor(req.query.cursor) : null;

  if (req.query.cursor && !cursor) {
    return res.status(400).json({
      error: "Invalid cursor.",
    });
  }

  const products = await prisma.product.findMany({
    where: buildWhereClause(req.query, cursor),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = products.length > limit;
  const items = hasMore ? products.slice(0, limit) : products;

  return res.json({
    hasMore,
    nextCursor:
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1])
        : null,
    items: items.map((product) => ({
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    })),
  });
};

module.exports = {
  getProducts,
};
