-- ============================================================================
-- queries.sql
-- Analytics queries for the Sales Data Warehouse (Star Schema)
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TOTAL SALES BY COUNTRY
-- ─────────────────────────────────────────────────────────────────────────────
-- Aggregates revenue and order count per country.
-- Uses the dim_customers dimension to get country information.

SELECT
    c.country,
    COUNT(f.order_id)       AS total_orders,
    SUM(f.quantity)         AS total_units_sold,
    ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
FROM fact_sales f
JOIN dim_customers c ON f.customer_id = c.customer_id
GROUP BY c.country
ORDER BY total_revenue DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TOP 5 PRODUCTS BY REVENUE
-- ─────────────────────────────────────────────────────────────────────────────
-- Finds the highest-revenue products with their categories.
-- Uses the dim_products dimension.

SELECT
    p.product_name,
    p.category,
    COUNT(f.order_id)       AS times_ordered,
    SUM(f.quantity)         AS total_units_sold,
    ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
FROM fact_sales f
JOIN dim_products p ON f.product_id = p.product_id
GROUP BY p.product_name, p.category
ORDER BY total_revenue DESC
LIMIT 5;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MONTHLY REVENUE TREND
-- ─────────────────────────────────────────────────────────────────────────────
-- Shows revenue over time, month by month.
-- Uses the dim_date dimension for temporal analysis.

SELECT
    d.year,
    d.month,
    COUNT(f.order_id)       AS total_orders,
    ROUND(SUM(f.total_amount)::numeric, 2) AS monthly_revenue
FROM fact_sales f
JOIN dim_date d ON f.date_id = d.date_id
GROUP BY d.year, d.month
ORDER BY d.year, d.month;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BONUS: TOP CUSTOMERS BY SPENDING
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    c.customer_id,
    c.customer_name,
    c.country,
    COUNT(f.order_id)       AS total_orders,
    ROUND(SUM(f.total_amount)::numeric, 2) AS total_spent
FROM fact_sales f
JOIN dim_customers c ON f.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name, c.country
ORDER BY total_spent DESC
LIMIT 10;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. BONUS: QUARTERLY REVENUE BY CATEGORY
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
    d.year,
    d.quarter,
    p.category,
    ROUND(SUM(f.total_amount)::numeric, 2) AS quarterly_revenue
FROM fact_sales f
JOIN dim_date d ON f.date_id = d.date_id
JOIN dim_products p ON f.product_id = p.product_id
GROUP BY d.year, d.quarter, p.category
ORDER BY d.year, d.quarter, quarterly_revenue DESC;


-- =============================================================================
-- SNOWFLAKE SCHEMA QUERIES
-- =============================================================================
-- The snowflake schema normalizes dimension tables further.
-- Key difference: dimension tables reference sub-dimension tables via FKs
-- instead of storing descriptive strings directly.
--
-- IMPORTANT: Compare these queries with the star schema versions above.
-- Notice how each snowflake query needs EXTRA JOINs to reach the actual
-- descriptive values (country name, category name) through sub-dimensions.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SNOWFLAKE: TOTAL SALES BY COUNTRY
-- ─────────────────────────────────────────────────────────────────────────────
-- Compare with Query #1 (Star Schema):
--   Star:      fact_sales → dim_customers (country is directly in dim_customers)
--   Snowflake: fact_sales_sf → dim_customers_sf → dim_countries
--                                                  ^^^^^^^^^^^^
--   In snowflake, country is in a SEPARATE sub-dimension table, so we need
--   one extra JOIN to reach it. The result is identical but the path is longer.

SELECT
    co.country_name                     AS country,
    COUNT(f.order_id)                   AS total_orders,
    SUM(f.quantity)                     AS total_units_sold,
    ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
FROM fact_sales_sf f
JOIN dim_customers_sf c ON f.customer_id = c.customer_id
JOIN dim_countries co   ON c.country_id  = co.country_id    -- ← EXTRA JOIN!
GROUP BY co.country_name
ORDER BY total_revenue DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SNOWFLAKE: TOP 5 PRODUCTS BY REVENUE
-- ─────────────────────────────────────────────────────────────────────────────
-- Compare with Query #2 (Star Schema):
--   Star:      fact_sales → dim_products (category is directly in dim_products)
--   Snowflake: fact_sales_sf → dim_products_sf → dim_categories
--                                                 ^^^^^^^^^^^^^^^
--   In snowflake, category_name is in a SEPARATE sub-dimension table.

SELECT
    p.product_name,
    cat.category_name                    AS category,
    COUNT(f.order_id)                    AS times_ordered,
    SUM(f.quantity)                      AS total_units_sold,
    ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
FROM fact_sales_sf f
JOIN dim_products_sf p  ON f.product_id  = p.product_id
JOIN dim_categories cat ON p.category_id = cat.category_id  -- ← EXTRA JOIN!
GROUP BY p.product_name, cat.category_name
ORDER BY total_revenue DESC
LIMIT 5;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SNOWFLAKE: QUARTERLY REVENUE BY CATEGORY
-- ─────────────────────────────────────────────────────────────────────────────
-- This is the most complex snowflake query — it needs 3 JOINs:
--   fact_sales_sf → dim_date (shared, no change)
--   fact_sales_sf → dim_products_sf → dim_categories (extra join for category)
--
-- The star schema version only needs 2 JOINs for the same result.

SELECT
    d.year,
    d.quarter,
    cat.category_name                    AS category,
    ROUND(SUM(f.total_amount)::numeric, 2) AS quarterly_revenue
FROM fact_sales_sf f
JOIN dim_date d         ON f.date_id     = d.date_id
JOIN dim_products_sf p  ON f.product_id  = p.product_id
JOIN dim_categories cat ON p.category_id = cat.category_id  -- ← EXTRA JOIN!
GROUP BY d.year, d.quarter, cat.category_name
ORDER BY d.year, d.quarter, quarterly_revenue DESC;
