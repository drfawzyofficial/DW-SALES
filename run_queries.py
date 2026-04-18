"""
run_queries.py
--------------
Execute the analytics SQL queries against the Data Warehouse
and display results in formatted tables.

Usage:
    python run_queries.py
"""

import pandas as pd
from sqlalchemy import create_engine, text

from config import DATABASE_URL


def run_query(engine, title: str, sql: str):
    """Execute a SQL query and print results as a formatted table."""
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}")

    with engine.connect() as conn:
        df = pd.read_sql(text(sql), conn)

    if df.empty:
        print("  (No results)")
    else:
        print(df.to_string(index=False))
    print()
    return df


def main():
    engine = create_engine(DATABASE_URL, echo=False)

    # ── Query 1: Total Sales by Country ────────────────────────────────────
    run_query(engine, "📊 TOTAL SALES BY COUNTRY", """
        SELECT
            c.country,
            COUNT(f.order_id)       AS total_orders,
            SUM(f.quantity)         AS total_units_sold,
            ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
        FROM fact_sales f
        JOIN dim_customers c ON f.customer_id = c.customer_id
        GROUP BY c.country
        ORDER BY total_revenue DESC
    """)

    # ── Query 2: Top 5 Products by Revenue ─────────────────────────────────
    run_query(engine, "🏆 TOP 5 PRODUCTS BY REVENUE", """
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
        LIMIT 5
    """)

    # ── Query 3: Monthly Revenue Trend ─────────────────────────────────────
    run_query(engine, "📈 MONTHLY REVENUE TREND", """
        SELECT
            d.year,
            d.month,
            COUNT(f.order_id)       AS total_orders,
            ROUND(SUM(f.total_amount)::numeric, 2) AS monthly_revenue
        FROM fact_sales f
        JOIN dim_date d ON f.date_id = d.date_id
        GROUP BY d.year, d.month
        ORDER BY d.year, d.month
    """)

    # ── Query 4: Top Customers by Spending ─────────────────────────────────
    run_query(engine, "👤 TOP 10 CUSTOMERS BY SPENDING", """
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
        LIMIT 10
    """)

    # ── Query 5: Quarterly Revenue by Category ─────────────────────────────
    run_query(engine, "📦 QUARTERLY REVENUE BY CATEGORY", """
        SELECT
            d.year,
            d.quarter,
            p.category,
            ROUND(SUM(f.total_amount)::numeric, 2) AS quarterly_revenue
        FROM fact_sales f
        JOIN dim_date d ON f.date_id = d.date_id
        JOIN dim_products p ON f.product_id = p.product_id
        GROUP BY d.year, d.quarter, p.category
        ORDER BY d.year, d.quarter, quarterly_revenue DESC
    """)

    engine.dispose()
    print("\n✅ All queries executed successfully!")


if __name__ == "__main__":
    main()
