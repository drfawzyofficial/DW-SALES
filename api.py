"""
api.py
------
Flask REST API that serves Data Warehouse analytics data to the React frontend.
Endpoints return JSON data from PostgreSQL star schema queries.

Usage:
    python3 api.py
"""

from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text
from config import DATABASE_URL

app = Flask(__name__)
CORS(app)

engine = create_engine(DATABASE_URL, echo=False)


def query_to_list(sql: str) -> list[dict]:
    """Execute SQL and return list of dicts."""
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        columns = list(result.keys())
        return [dict(zip(columns, row)) for row in result.fetchall()]


# ── Schema Info ────────────────────────────────────────────────────────────────

@app.route("/api/schema")
def get_schema():
    """Return star schema table info (columns, row counts)."""
    tables = {}
    for table in ["dim_customers", "dim_products", "dim_date", "fact_sales"]:
        cols = query_to_list(f"""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = '{table}'
            ORDER BY ordinal_position
        """)
        count = query_to_list(f"SELECT COUNT(*) as count FROM {table}")[0]["count"]
        tables[table] = {"columns": cols, "row_count": count}
    return jsonify(tables)


# ── ETL Log ────────────────────────────────────────────────────────────────────

@app.route("/api/etl-log")
def get_etl_log():
    """Return ETL pipeline log contents."""
    try:
        with open("etl.log", "r") as f:
            lines = f.readlines()
        return jsonify({"log": [line.strip() for line in lines if line.strip()]})
    except FileNotFoundError:
        return jsonify({"log": ["ETL log not found. Run etl_pipeline.py first."]})


# ── Sample Data ────────────────────────────────────────────────────────────────

@app.route("/api/sample/<table_name>")
def get_sample(table_name):
    """Return first 10 rows of a table."""
    allowed = ["dim_customers", "dim_products", "dim_date", "fact_sales"]
    if table_name not in allowed:
        return jsonify({"error": "Invalid table name"}), 400
    rows = query_to_list(f"SELECT * FROM {table_name} LIMIT 10")
    # Convert date objects to strings
    for row in rows:
        for k, v in row.items():
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()
    return jsonify(rows)


# ── Analytics Queries ──────────────────────────────────────────────────────────

@app.route("/api/sales-by-country")
def sales_by_country():
    """Total sales aggregated by country."""
    data = query_to_list("""
        SELECT
            c.country,
            COUNT(f.order_id)::int AS total_orders,
            SUM(f.quantity)::int AS total_units_sold,
            ROUND(SUM(f.total_amount)::numeric, 2)::float AS total_revenue
        FROM fact_sales f
        JOIN dim_customers c ON f.customer_id = c.customer_id
        GROUP BY c.country
        ORDER BY total_revenue DESC
    """)
    return jsonify(data)


@app.route("/api/top-products")
def top_products():
    """Top 5 products by revenue."""
    data = query_to_list("""
        SELECT
            p.product_name,
            p.category,
            COUNT(f.order_id)::int AS times_ordered,
            SUM(f.quantity)::int AS total_units_sold,
            ROUND(SUM(f.total_amount)::numeric, 2)::float AS total_revenue
        FROM fact_sales f
        JOIN dim_products p ON f.product_id = p.product_id
        GROUP BY p.product_name, p.category
        ORDER BY total_revenue DESC
        LIMIT 5
    """)
    return jsonify(data)


@app.route("/api/monthly-revenue")
def monthly_revenue():
    """Monthly revenue trend."""
    data = query_to_list("""
        SELECT
            d.year::int AS year,
            d.month::int AS month,
            COUNT(f.order_id)::int AS total_orders,
            ROUND(SUM(f.total_amount)::numeric, 2)::float AS monthly_revenue
        FROM fact_sales f
        JOIN dim_date d ON f.date_id = d.date_id
        GROUP BY d.year, d.month
        ORDER BY d.year, d.month
    """)
    # Create readable label
    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for row in data:
        row["label"] = f"{month_names[row['month']]} {row['year']}"
    return jsonify(data)


@app.route("/api/top-customers")
def top_customers():
    """Top 10 customers by spending."""
    data = query_to_list("""
        SELECT
            c.customer_id::int AS customer_id,
            c.customer_name,
            c.country,
            COUNT(f.order_id)::int AS total_orders,
            ROUND(SUM(f.total_amount)::numeric, 2)::float AS total_spent
        FROM fact_sales f
        JOIN dim_customers c ON f.customer_id = c.customer_id
        GROUP BY c.customer_id, c.customer_name, c.country
        ORDER BY total_spent DESC
        LIMIT 10
    """)
    return jsonify(data)


@app.route("/api/quarterly-category")
def quarterly_category():
    """Quarterly revenue by product category."""
    data = query_to_list("""
        SELECT
            d.year::int AS year,
            d.quarter::int AS quarter,
            p.category,
            ROUND(SUM(f.total_amount)::numeric, 2)::float AS quarterly_revenue
        FROM fact_sales f
        JOIN dim_date d ON f.date_id = d.date_id
        JOIN dim_products p ON f.product_id = p.product_id
        GROUP BY d.year, d.quarter, p.category
        ORDER BY d.year, d.quarter, quarterly_revenue DESC
    """)
    return jsonify(data)


if __name__ == "__main__":
    print("🚀 API running at http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
