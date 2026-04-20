"""
etl_pipeline.py
---------------
End-to-end ETL pipeline for the Sales Data Warehouse.

Workflow:
    1. Extract  → Load raw CSV into a pandas DataFrame
    2. Transform → Clean, enrich, and normalize into star schema tables
    3. Load     → Create PostgreSQL tables and insert data

Usage:
    python etl_pipeline.py
"""

import logging
import sys

import pandas as pd
from sqlalchemy import (
    create_engine,
    text,
    Column,
    Integer,
    String,
    Float,
    Date,
    ForeignKey,
    MetaData,
    Table,
    Index,
)

from config import DATABASE_URL, CSV_FILE_PATH

# ══════════════════════════════════════════════════════════════════════════════
# LOGGING SETUP
# ══════════════════════════════════════════════════════════════════════════════
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("etl.log", mode="w", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# 1. EXTRACT
# ══════════════════════════════════════════════════════════════════════════════
def extract_data(csv_path: str) -> pd.DataFrame:
    """
    Load raw sales data from a CSV file.

    Args:
        csv_path: Path to the source CSV file.

    Returns:
        Raw pandas DataFrame.
    """
    logger.info("📥 EXTRACT — Loading CSV from '%s'", csv_path)
    df = pd.read_csv(csv_path)
    logger.info("   Loaded %d rows, %d columns", len(df), len(df.columns))
    logger.info("   Columns: %s", list(df.columns))
    return df


# ══════════════════════════════════════════════════════════════════════════════
# 2. TRANSFORM
# ══════════════════════════════════════════════════════════════════════════════
def transform_data(df: pd.DataFrame) -> dict:
    """
    Clean, enrich, and normalize raw data into star schema DataFrames.

    Steps:
        - Handle missing values
        - Convert date column to datetime
        - Remove duplicates
        - Create total_amount column
        - Normalize into dimension and fact tables

    Args:
        df: Raw DataFrame from extract step.

    Returns:
        Dictionary with keys: 'dim_customers', 'dim_products', 'dim_date', 'fact_sales'
    """
    logger.info("🔄 TRANSFORM — Starting data transformation")

    # ── Step 1: Handle missing values ──────────────────────────────────────
    logger.info("   Handling missing values...")
    missing_before = df.isnull().sum().sum() + (df == "").sum().sum()

    # Replace empty strings with NaN for uniform handling
    df.replace("", pd.NA, inplace=True)

    # Fill missing customer names with 'Unknown'
    df["customer_name"] = df["customer_name"].fillna("Unknown")

    # Fill missing categories with 'Uncategorized'
    df["category"] = df["category"].fillna("Uncategorized")

    # Fill missing quantity with median (more robust than mean)
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce")
    median_qty = df["quantity"].median()
    df["quantity"] = df["quantity"].fillna(median_qty).astype(int)

    missing_after = df.isnull().sum().sum()
    logger.info("   Missing values: %d → %d", missing_before, missing_after)

    # ── Step 2: Convert date to datetime ───────────────────────────────────
    logger.info("   Converting 'date' column to datetime...")
    df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d")

    # ── Step 3: Remove duplicates ──────────────────────────────────────────
    rows_before = len(df)
    df.drop_duplicates(subset=["order_id"], keep="first", inplace=True)
    df.reset_index(drop=True, inplace=True)
    logger.info("   Removed %d duplicate rows (%d → %d)", rows_before - len(df), rows_before, len(df))

    # ── Step 4: Create total_amount ────────────────────────────────────────
    df["total_amount"] = df["quantity"] * df["price"]
    logger.info("   Created 'total_amount' column (quantity × price)")

    # ── Step 5: Normalize into star schema ─────────────────────────────────
    logger.info("   Normalizing into dimension and fact tables...")

    # --- dim_customers ---
    dim_customers = (
        df[["customer_id", "customer_name", "country"]]
        .drop_duplicates(subset=["customer_id"])
        .reset_index(drop=True)
    )
    logger.info("   dim_customers: %d rows", len(dim_customers))

    # --- dim_products ---
    dim_products = (
        df[["product_id", "product_name", "category", "price"]]
        .drop_duplicates(subset=["product_id"])
        .reset_index(drop=True)
    )
    logger.info("   dim_products: %d rows", len(dim_products))

    # --- dim_date ---
    dates = df["date"].drop_duplicates().sort_values().reset_index(drop=True)
    dim_date = pd.DataFrame({
        "date_id": range(1, len(dates) + 1),
        "full_date": dates,
        "year": dates.dt.year,
        "month": dates.dt.month,
        "day": dates.dt.day,
        "quarter": dates.dt.quarter,
        "day_of_week": dates.dt.day_name(),
    })
    logger.info("   dim_date: %d rows", len(dim_date))

    # --- fact_sales ---
    # Map each order's date to the corresponding date_id
    date_to_id = dict(zip(dim_date["full_date"], dim_date["date_id"]))
    fact_sales = pd.DataFrame({
        "order_id": df["order_id"],
        "date_id": df["date"].map(date_to_id),
        "customer_id": df["customer_id"],
        "product_id": df["product_id"],
        "quantity": df["quantity"],
        "price": df["price"],
        "total_amount": df["total_amount"],
    })
    logger.info("   fact_sales: %d rows", len(fact_sales))

    # ══════════════════════════════════════════════════════════════════════
    # SNOWFLAKE SCHEMA TABLES
    # ══════════════════════════════════════════════════════════════════════
    # In a Snowflake Schema, dimension tables are further normalized.
    # Instead of storing category directly in dim_products, we extract it
    # into a separate dim_categories table. Similarly, country is extracted
    # from dim_customers into dim_countries.
    #
    # Why? This reduces data redundancy in dimension tables.
    # Trade-off: Queries need more JOINs (slower) but storage is optimized.
    # ──────────────────────────────────────────────────────────────────────

    logger.info("❄️  SNOWFLAKE — Normalizing dimension tables further...")

    # --- dim_categories (sub-dimension extracted from dim_products) ---
    # Each unique category gets its own ID.
    categories = dim_products["category"].drop_duplicates().sort_values().reset_index(drop=True)
    dim_categories = pd.DataFrame({
        "category_id": range(1, len(categories) + 1),
        "category_name": categories,
    })
    logger.info("   dim_categories: %d rows", len(dim_categories))

    # --- dim_countries (sub-dimension extracted from dim_customers) ---
    # Each unique country gets its own ID.
    countries = dim_customers["country"].drop_duplicates().sort_values().reset_index(drop=True)
    dim_countries = pd.DataFrame({
        "country_id": range(1, len(countries) + 1),
        "country_name": countries,
    })
    logger.info("   dim_countries: %d rows", len(dim_countries))

    # --- dim_products_sf (snowflake version — category replaced with FK) ---
    # Instead of storing the category string, we store a category_id
    # that references the dim_categories table.
    cat_name_to_id = dict(zip(dim_categories["category_name"], dim_categories["category_id"]))
    dim_products_sf = dim_products.copy()
    dim_products_sf["category_id"] = dim_products_sf["category"].map(cat_name_to_id)
    dim_products_sf = dim_products_sf[["product_id", "product_name", "category_id", "price"]]
    logger.info("   dim_products_sf: %d rows (category → category_id FK)", len(dim_products_sf))

    # --- dim_customers_sf (snowflake version — country replaced with FK) ---
    # Instead of storing the country string, we store a country_id
    # that references the dim_countries table.
    country_name_to_id = dict(zip(dim_countries["country_name"], dim_countries["country_id"]))
    dim_customers_sf = dim_customers.copy()
    dim_customers_sf["country_id"] = dim_customers_sf["country"].map(country_name_to_id)
    dim_customers_sf = dim_customers_sf[["customer_id", "customer_name", "country_id"]]
    logger.info("   dim_customers_sf: %d rows (country → country_id FK)", len(dim_customers_sf))

    # --- fact_sales_sf (identical to star schema fact table) ---
    # The fact table stays the same in snowflake schema.
    # The normalization only affects dimension tables.
    fact_sales_sf = fact_sales.copy()
    logger.info("   fact_sales_sf: %d rows (same as star schema)", len(fact_sales_sf))

    # ══════════════════════════════════════════════════════════════════════
    # GALAXY SCHEMA (FACT CONSTELLATION) TABLES
    # ══════════════════════════════════════════════════════════════════════
    # A Galaxy Schema (also called Fact Constellation) uses MULTIPLE fact
    # tables that SHARE dimension tables. This is how real-world data
    # warehouses work — a single business has many measurable processes
    # (sales, returns, inventory, shipping, etc.) that all reference the
    # same customers, products, dates, etc.
    #
    # Our galaxy schema has:
    #   - fact_sales_galaxy   → sales transactions (reuses star dims)
    #   - fact_returns_galaxy → product returns (new fact, shared dims)
    #   - dim_return_reasons  → why an item was returned (new dimension)
    #
    # Both fact tables share dim_customers, dim_products, and dim_date.
    # ──────────────────────────────────────────────────────────────────────

    logger.info("🌌 GALAXY — Creating Fact Constellation (multiple fact tables)...")

    # --- fact_sales_galaxy (identical to star schema fact table) ---
    fact_sales_galaxy = fact_sales.copy()
    logger.info("   fact_sales_galaxy: %d rows (shared with star dims)", len(fact_sales_galaxy))

    # --- dim_return_reasons (new dimension for returns) ---
    reason_list = [
        "Defective", "Wrong Item", "Changed Mind",
        "Better Price Elsewhere", "Late Delivery", "Poor Quality",
    ]
    dim_return_reasons = pd.DataFrame({
        "reason_id": range(1, len(reason_list) + 1),
        "reason_name": reason_list,
    })
    logger.info("   dim_return_reasons: %d rows", len(dim_return_reasons))

    # --- fact_returns_galaxy (second fact table — simulated returns) ---
    # Simulate returns: ~15% of orders result in a return.
    # Each return references the same customer/product/date dimensions.
    import numpy as np
    rng = np.random.RandomState(42)   # deterministic for reproducibility

    return_mask = rng.random(len(fact_sales)) < 0.15
    returns_base = fact_sales[return_mask].copy().reset_index(drop=True)

    fact_returns_galaxy = pd.DataFrame({
        "return_id": range(1, len(returns_base) + 1),
        "order_id": returns_base["order_id"],
        "date_id": returns_base["date_id"],
        "customer_id": returns_base["customer_id"],
        "product_id": returns_base["product_id"],
        "quantity_returned": rng.randint(1, returns_base["quantity"].values + 1),
        "refund_amount": (rng.randint(1, returns_base["quantity"].values + 1)
                         * returns_base["price"].values).round(2),
        "reason_id": rng.choice(dim_return_reasons["reason_id"].values, size=len(returns_base)),
    })
    # Recalculate refund_amount based on actual quantity_returned
    fact_returns_galaxy["refund_amount"] = (
        fact_returns_galaxy["quantity_returned"] * returns_base["price"].values
    ).round(2)
    logger.info("   fact_returns_galaxy: %d rows (simulated returns)", len(fact_returns_galaxy))

    logger.info("✅ TRANSFORM — Complete (Star + Snowflake + Galaxy)")

    return {
        # Star schema tables
        "dim_customers": dim_customers,
        "dim_products": dim_products,
        "dim_date": dim_date,
        "fact_sales": fact_sales,
        # Snowflake schema tables
        "dim_categories": dim_categories,
        "dim_countries": dim_countries,
        "dim_products_sf": dim_products_sf,
        "dim_customers_sf": dim_customers_sf,
        "fact_sales_sf": fact_sales_sf,
        # Galaxy schema tables
        "fact_sales_galaxy": fact_sales_galaxy,
        "fact_returns_galaxy": fact_returns_galaxy,
        "dim_return_reasons": dim_return_reasons,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 3. CREATE TABLES (DDL)
# ══════════════════════════════════════════════════════════════════════════════
def create_tables(engine):
    """
    Create star schema tables in PostgreSQL using SQLAlchemy Core.
    Drops existing tables to ensure a clean load (idempotent).

    Tables created:
        - dim_customers
        - dim_products
        - dim_date
        - fact_sales (with foreign keys to all dimensions)
    """
    logger.info("🗄️  CREATE TABLES — Defining schema...")

    metadata = MetaData()

    # ══════════════════════════════════════════════════════════════════════
    # STAR SCHEMA TABLES
    # ══════════════════════════════════════════════════════════════════════

    # ── Dimension: Customers ───────────────────────────────────────────────
    dim_customers = Table(
        "dim_customers", metadata,
        Column("customer_id", Integer, primary_key=True),
        Column("customer_name", String(100), nullable=False),
        Column("country", String(50), nullable=False),
    )

    # ── Dimension: Products ────────────────────────────────────────────────
    dim_products = Table(
        "dim_products", metadata,
        Column("product_id", Integer, primary_key=True),
        Column("product_name", String(100), nullable=False),
        Column("category", String(50), nullable=False),
        Column("price", Float, nullable=False),
    )

    # ── Dimension: Date ────────────────────────────────────────────────────
    dim_date = Table(
        "dim_date", metadata,
        Column("date_id", Integer, primary_key=True),
        Column("full_date", Date, nullable=False, unique=True),
        Column("year", Integer, nullable=False),
        Column("month", Integer, nullable=False),
        Column("day", Integer, nullable=False),
        Column("quarter", Integer, nullable=False),
        Column("day_of_week", String(15), nullable=False),
    )

    # ── Fact: Sales ────────────────────────────────────────────────────────
    fact_sales = Table(
        "fact_sales", metadata,
        Column("order_id", Integer, primary_key=True),
        Column("date_id", Integer, ForeignKey("dim_date.date_id"), nullable=False),
        Column("customer_id", Integer, ForeignKey("dim_customers.customer_id"), nullable=False),
        Column("product_id", Integer, ForeignKey("dim_products.product_id"), nullable=False),
        Column("quantity", Integer, nullable=False),
        Column("price", Float, nullable=False),
        Column("total_amount", Float, nullable=False),
    )

    # ══════════════════════════════════════════════════════════════════════
    # SNOWFLAKE SCHEMA TABLES
    # ══════════════════════════════════════════════════════════════════════
    # These tables demonstrate further normalization of dimension tables.
    # Sub-dimensions (dim_categories, dim_countries) are extracted.
    # ──────────────────────────────────────────────────────────────────────

    # ── Sub-Dimension: Categories (extracted from dim_products) ────────────
    dim_categories = Table(
        "dim_categories", metadata,
        Column("category_id", Integer, primary_key=True),
        Column("category_name", String(50), nullable=False, unique=True),
    )

    # ── Sub-Dimension: Countries (extracted from dim_customers) ────────────
    dim_countries = Table(
        "dim_countries", metadata,
        Column("country_id", Integer, primary_key=True),
        Column("country_name", String(50), nullable=False, unique=True),
    )

    # ── Dimension: Products (Snowflake — references dim_categories) ────────
    dim_products_sf = Table(
        "dim_products_sf", metadata,
        Column("product_id", Integer, primary_key=True),
        Column("product_name", String(100), nullable=False),
        Column("category_id", Integer, ForeignKey("dim_categories.category_id"), nullable=False),
        Column("price", Float, nullable=False),
    )

    # ── Dimension: Customers (Snowflake — references dim_countries) ────────
    dim_customers_sf = Table(
        "dim_customers_sf", metadata,
        Column("customer_id", Integer, primary_key=True),
        Column("customer_name", String(100), nullable=False),
        Column("country_id", Integer, ForeignKey("dim_countries.country_id"), nullable=False),
    )

    # ── Fact: Sales (Snowflake — same structure, references SF dimensions) ─
    fact_sales_sf = Table(
        "fact_sales_sf", metadata,
        Column("order_id", Integer, primary_key=True),
        Column("date_id", Integer, ForeignKey("dim_date.date_id"), nullable=False),
        Column("customer_id", Integer, ForeignKey("dim_customers_sf.customer_id"), nullable=False),
        Column("product_id", Integer, ForeignKey("dim_products_sf.product_id"), nullable=False),
        Column("quantity", Integer, nullable=False),
        Column("price", Float, nullable=False),
        Column("total_amount", Float, nullable=False),
    )

    # ══════════════════════════════════════════════════════════════════════
    # GALAXY SCHEMA (FACT CONSTELLATION) TABLES
    # ══════════════════════════════════════════════════════════════════════
    # A Galaxy Schema has MULTIPLE fact tables that SHARE dimension tables.
    # Here: fact_sales_galaxy and fact_returns_galaxy both reference the
    # same dim_customers, dim_products, and dim_date dimensions.
    # ──────────────────────────────────────────────────────────────────────

    # ── Fact: Sales (Galaxy — shares star schema dimensions) ───────────────
    fact_sales_galaxy = Table(
        "fact_sales_galaxy", metadata,
        Column("order_id", Integer, primary_key=True),
        Column("date_id", Integer, ForeignKey("dim_date.date_id"), nullable=False),
        Column("customer_id", Integer, ForeignKey("dim_customers.customer_id"), nullable=False),
        Column("product_id", Integer, ForeignKey("dim_products.product_id"), nullable=False),
        Column("quantity", Integer, nullable=False),
        Column("price", Float, nullable=False),
        Column("total_amount", Float, nullable=False),
    )

    # ── Dimension: Return Reasons (Galaxy-only dimension) ──────────────────
    dim_return_reasons = Table(
        "dim_return_reasons", metadata,
        Column("reason_id", Integer, primary_key=True),
        Column("reason_name", String(100), nullable=False, unique=True),
    )

    # ── Fact: Returns (Galaxy — second fact table, shares dimensions) ──────
    fact_returns_galaxy = Table(
        "fact_returns_galaxy", metadata,
        Column("return_id", Integer, primary_key=True),
        Column("order_id", Integer, nullable=False),
        Column("date_id", Integer, ForeignKey("dim_date.date_id"), nullable=False),
        Column("customer_id", Integer, ForeignKey("dim_customers.customer_id"), nullable=False),
        Column("product_id", Integer, ForeignKey("dim_products.product_id"), nullable=False),
        Column("quantity_returned", Integer, nullable=False),
        Column("refund_amount", Float, nullable=False),
        Column("reason_id", Integer, ForeignKey("dim_return_reasons.reason_id"), nullable=False),
    )

    # ── Drop existing tables (reverse dependency order) & recreate ─────────
    metadata.drop_all(engine, checkfirst=True)
    metadata.create_all(engine)
    logger.info("   Created star schema tables: dim_customers, dim_products, dim_date, fact_sales")
    logger.info("   Created snowflake tables: dim_categories, dim_countries, dim_products_sf, dim_customers_sf, fact_sales_sf")
    logger.info("   Created galaxy tables: fact_sales_galaxy, fact_returns_galaxy, dim_return_reasons")

    # ── Create indexes for query performance ───────────────────────────────
    logger.info("   Creating indexes...")
    with engine.begin() as conn:
        # Star schema indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_date_id ON fact_sales (date_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_customer_id ON fact_sales (customer_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_product_id ON fact_sales (product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_date_year_month ON dim_date (year, month)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_customers_country ON dim_customers (country)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_products_category ON dim_products (category)"))

        # Snowflake schema indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_sf_date_id ON fact_sales_sf (date_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_sf_customer_id ON fact_sales_sf (customer_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_sf_product_id ON fact_sales_sf (product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_products_sf_category_id ON dim_products_sf (category_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_customers_sf_country_id ON dim_customers_sf (country_id)"))

        # Galaxy schema indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_galaxy_date_id ON fact_sales_galaxy (date_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_galaxy_customer_id ON fact_sales_galaxy (customer_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_galaxy_product_id ON fact_sales_galaxy (product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_returns_galaxy_date_id ON fact_returns_galaxy (date_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_returns_galaxy_customer_id ON fact_returns_galaxy (customer_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_returns_galaxy_product_id ON fact_returns_galaxy (product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_returns_galaxy_reason_id ON fact_returns_galaxy (reason_id)"))

    logger.info("✅ CREATE TABLES — Complete (Star + Snowflake + Galaxy with indexes)")


# ══════════════════════════════════════════════════════════════════════════════
# 4. LOAD
# ══════════════════════════════════════════════════════════════════════════════
def load_data(engine, tables: dict):
    """
    Load transformed DataFrames into PostgreSQL tables.

    Dimension tables are loaded first (parent tables),
    then the fact table (child table with foreign keys).

    Args:
        engine: SQLAlchemy engine connected to PostgreSQL.
        tables: Dict from transform_data() with DataFrames.
    """
    logger.info("📤 LOAD — Inserting data into PostgreSQL...")

    # ── Load order: dimensions first, then facts ───────────────────────────
    # Parent tables must be loaded before child tables (foreign key deps).
    load_order = [
        # Star schema tables
        ("dim_customers", tables["dim_customers"]),
        ("dim_products", tables["dim_products"]),
        ("dim_date", tables["dim_date"]),
        ("fact_sales", tables["fact_sales"]),
        # Snowflake schema tables — sub-dimensions first, then dims, then fact
        ("dim_categories", tables["dim_categories"]),
        ("dim_countries", tables["dim_countries"]),
        ("dim_products_sf", tables["dim_products_sf"]),
        ("dim_customers_sf", tables["dim_customers_sf"]),
        ("fact_sales_sf", tables["fact_sales_sf"]),
        # Galaxy schema tables — reasons dim first, then facts
        ("dim_return_reasons", tables["dim_return_reasons"]),
        ("fact_sales_galaxy", tables["fact_sales_galaxy"]),
        ("fact_returns_galaxy", tables["fact_returns_galaxy"]),
    ]

    for table_name, df in load_order:
        df.to_sql(
            name=table_name,
            con=engine,
            if_exists="append",   # Tables already created by create_tables()
            index=False,
            method="multi",       # Batch insert for performance
        )
        logger.info("   ✔ %s — %d rows loaded", table_name, len(df))

    logger.info("✅ LOAD — Complete (Star + Snowflake + Galaxy)")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN — Run the full ETL pipeline
# ══════════════════════════════════════════════════════════════════════════════
def main():
    """Execute the full ETL pipeline."""
    logger.info("=" * 60)
    logger.info("🚀 SALES DATA WAREHOUSE — ETL PIPELINE")
    logger.info("=" * 60)

    # ── Create database engine ─────────────────────────────────────────────
    logger.info("Connecting to PostgreSQL: %s", DATABASE_URL.split("@")[-1])
    engine = create_engine(DATABASE_URL, echo=False)

    # Test connection
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
    except Exception as e:
        logger.error("❌ Database connection failed: %s", e)
        logger.error("   Make sure PostgreSQL is running and the database 'sales_dw' exists.")
        logger.error("   Run: CREATE DATABASE sales_dw;")
        sys.exit(1)

    # ── Run ETL ────────────────────────────────────────────────────────────
    raw_df = extract_data(CSV_FILE_PATH)
    tables = transform_data(raw_df)
    create_tables(engine)
    load_data(engine, tables)

    logger.info("=" * 60)
    logger.info("🎉 ETL PIPELINE COMPLETED SUCCESSFULLY")
    logger.info("=" * 60)

    engine.dispose()


if __name__ == "__main__":
    main()
