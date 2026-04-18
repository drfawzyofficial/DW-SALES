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

    logger.info("✅ TRANSFORM — Complete")

    return {
        "dim_customers": dim_customers,
        "dim_products": dim_products,
        "dim_date": dim_date,
        "fact_sales": fact_sales,
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

    # ── Drop existing tables (reverse dependency order) & recreate ─────────
    metadata.drop_all(engine, checkfirst=True)
    metadata.create_all(engine)
    logger.info("   Created tables: dim_customers, dim_products, dim_date, fact_sales")

    # ── Create indexes for query performance ───────────────────────────────
    logger.info("   Creating indexes...")
    with engine.begin() as conn:
        # Indexes on fact_sales foreign keys (speeds up JOINs)
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_date_id ON fact_sales (date_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_customer_id ON fact_sales (customer_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_fact_sales_product_id ON fact_sales (product_id)"))

        # Index on dim_date for time-based filtering
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_date_year_month ON dim_date (year, month)"))

        # Index on dim_customers for country-based grouping
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_customers_country ON dim_customers (country)"))

        # Index on dim_products for category-based grouping
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dim_products_category ON dim_products (category)"))

    logger.info("✅ CREATE TABLES — Complete (with indexes)")


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
    load_order = [
        ("dim_customers", tables["dim_customers"]),
        ("dim_products", tables["dim_products"]),
        ("dim_date", tables["dim_date"]),
        ("fact_sales", tables["fact_sales"]),
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

    logger.info("✅ LOAD — Complete")


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
