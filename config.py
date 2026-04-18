"""
config.py
---------
Central configuration for the Data Warehouse project.
Update the DATABASE_URL with your actual PostgreSQL credentials.
"""

# ── PostgreSQL Connection String ───────────────────────────────────────────────
# Format: postgresql://username:password@host:port/database_name
#
# Example:
#   DATABASE_URL = "postgresql://postgres:mypassword@localhost:5432/sales_dw"
#
# Before running the ETL, make sure to:
#   1. Install PostgreSQL on your machine
#   2. Create a database:  CREATE DATABASE sales_dw;
#   3. Update the credentials below

DATABASE_URL = "postgresql://abdulrahmanfawzy@localhost:5432/sales_dw"

# ── File Paths ─────────────────────────────────────────────────────────────────
CSV_FILE_PATH = "data/sales_data.csv"
