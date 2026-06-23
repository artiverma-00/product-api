import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const PAGE_SIZE = 12;

const CATEGORY_OPTIONS = [
  "Electronics",
  "Books",
  "Sports",
  "Fashion",
  "Furniture",
  "Home",
  "Beauty",
  "Toys",
];

const EMPTY_FILTERS = {
  categories: [],
  minPrice: "",
  maxPrice: "",
};

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function buildQueryParams(filters, cursor) {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  for (const category of filters.categories) {
    params.append("category", category);
  }

  if (filters.minPrice !== "") {
    params.set("minPrice", filters.minPrice);
  }

  if (filters.maxPrice !== "") {
    params.set("maxPrice", filters.maxPrice);
  }

  return params;
}

function formatRelativeTime(value) {
  const date = new Date(value);
  const elapsedSeconds = Math.round((Date.now() - date.getTime()) / 1000);

  const units = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, step] of units) {
    if (Math.abs(elapsedSeconds) >= step || unit === "minute") {
      return relativeFormatter.format(-Math.round(elapsedSeconds / step), unit);
    }
  }

  return "just now";
}

function isNewArrival(value) {
  return Date.now() - new Date(value).getTime() < 24 * 60 * 60 * 1000;
}

function SkeletonCard() {
  return (
    <article className="product-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-badge" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
      <div className="skeleton skeleton-meta" />
    </article>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS);
  const sentinelRef = useRef(null);
  const catalogRef = useRef(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadProducts() {
      setLoadingInitial(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/products?${buildQueryParams(activeFilters).toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const payload = await response.json();

        if (ignore) {
          return;
        }

        setProducts(payload.items ?? []);
        setNextCursor(payload.nextCursor ?? null);
        setHasMore(Boolean(payload.hasMore));
      } catch (fetchError) {
        if (fetchError.name === "AbortError" || ignore) {
          return;
        }

        setError(fetchError.message || "Unable to load products.");
        setProducts([]);
        setNextCursor(null);
        setHasMore(false);
      } finally {
        if (!ignore) {
          setLoadingInitial(false);
        }
      }
    }

    loadProducts();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [activeFilters]);

  const activeFilterSummary = useMemo(() => {
    const parts = [];

    if (activeFilters.categories.length > 0) {
      parts.push(activeFilters.categories.join(", "));
    }

    if (activeFilters.minPrice !== "") {
      parts.push(
        `From ${moneyFormatter.format(Number(activeFilters.minPrice))}`,
      );
    }

    if (activeFilters.maxPrice !== "") {
      parts.push(
        `Up to ${moneyFormatter.format(Number(activeFilters.maxPrice))}`,
      );
    }

    return parts.length > 0 ? parts.join(" • ") : "Newest first";
  }, [activeFilters]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore || loadingInitial) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (
          !entry.isIntersecting ||
          !nextCursor ||
          loadingInitial ||
          loadingMoreRef.current
        ) {
          return;
        }

        loadingMoreRef.current = true;
        setLoadingMore(true);
        setError("");

        try {
          const response = await fetch(
            `${API_BASE_URL}/products?${buildQueryParams(activeFilters, nextCursor).toString()}`,
          );

          if (!response.ok) {
            throw new Error("Unable to load more products.");
          }

          const payload = await response.json();

          setProducts((currentProducts) => [
            ...currentProducts,
            ...(payload.items ?? []),
          ]);
          setNextCursor(payload.nextCursor ?? null);
          setHasMore(Boolean(payload.hasMore));
        } catch (fetchError) {
          setError(fetchError.message || "Unable to load more products.");
        } finally {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [activeFilters, hasMore, loadingInitial, nextCursor]);

  function applyFilters(event) {
    event.preventDefault();
    setActiveFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setActiveFilters(EMPTY_FILTERS);
  }

  function toggleCategory(category) {
    setDraftFilters((currentFilters) => {
      const isSelected = currentFilters.categories.includes(category);

      return {
        ...currentFilters,
        categories: isSelected
          ? currentFilters.categories.filter((item) => item !== category)
          : [...currentFilters.categories, category],
      };
    });
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Product browser</p>
          <h1>Browse products without page numbers.</h1>
          <p className="hero-text">
            A clean card grid with keyset pagination, fast filter resets, and a
            simple load-more flow that matches the backend.
          </p>

          <div className="hero-metadata">
            <button
              type="button"
              className="pill pill-accent pill-button"
              onClick={() =>
                catalogRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              aria-label="Jump to the newest products"
            >
              Showing newest first
            </button>
            <span className="pill">{activeFilterSummary}</span>
            <button
              type="button"
              className="pill pill-button"
              onClick={() =>
                catalogRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              aria-label="Jump to the product catalog"
            >
              {products.length} loaded
            </button>
          </div>
        </div>

        <form className="filter-panel" onSubmit={applyFilters}>
          <div className="filter-header">
            <div>
              <p className="filter-label">Filters</p>
              <h2>Refine the feed</h2>
            </div>

            <button
              type="button"
              className="ghost-button"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>

          <fieldset className="filter-group">
            <legend>Category</legend>
            <div className="category-grid" role="group" aria-label="Category">
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`category-chip ${draftFilters.categories.includes(category) ? "active" : ""}`}
                  aria-pressed={draftFilters.categories.includes(category)}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="price-grid">
            <label>
              <span>Min price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draftFilters.minPrice}
                onChange={(event) =>
                  setDraftFilters((currentFilters) => ({
                    ...currentFilters,
                    minPrice: event.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </label>

            <label>
              <span>Max price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draftFilters.maxPrice}
                onChange={(event) =>
                  setDraftFilters((currentFilters) => ({
                    ...currentFilters,
                    maxPrice: event.target.value,
                  }))
                }
                placeholder="100.00"
              />
            </label>
          </div>

          <button type="submit" className="primary-button">
            Apply filters
          </button>
        </form>
      </section>

      <section className="content-area" ref={catalogRef}>
        <div className="section-header">
          <div>
            <p className="section-kicker">Catalog</p>
            <h2>Curated for quick browsing</h2>
          </div>
          <p className="section-note">
            {hasMore
              ? "Infinite scroll appends the next cursor batch."
              : "No more products to load."}
          </p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {!loadingInitial && products.length === 0 ? (
          <div className="empty-state">
            <h3>No products match these filters.</h3>
            <p>
              Try clearing the category or price constraints to widen the feed.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="product-grid">
          {loadingInitial
            ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                <SkeletonCard key={index} />
              ))
            : products.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="card-topline">
                    <span className="category-badge">{product.category}</span>
                    {isNewArrival(product.createdAt) ? (
                      <span className="new-badge">New</span>
                    ) : null}
                  </div>

                  <h3>{product.name}</h3>

                  <div className="price-row">
                    <span>{moneyFormatter.format(product.price)}</span>
                    <span className="price-caption">
                      Added {formatRelativeTime(product.createdAt)}
                    </span>
                  </div>
                </article>
              ))}
        </div>

        <div className="load-more-row" ref={sentinelRef} aria-hidden="true">
          {loadingMore ? (
            <p className="finished-note">Loading more products…</p>
          ) : hasMore ? (
            <p className="finished-note">Scroll for more products.</p>
          ) : (
            <p className="finished-note">
              You have reached the end of the current feed.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
