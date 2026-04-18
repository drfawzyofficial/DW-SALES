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
