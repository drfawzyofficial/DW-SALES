# Sales Data Warehouse — ETL Pipeline & Dashboard

A full-stack Data Warehouse project featuring a Python ETL pipeline, PostgreSQL **Star + Snowflake + Galaxy** schemas, Flask REST API, and an interactive React dashboard built with Vite.

## Architecture

```
CSV File ──→ Extract ──→ Transform ──→ Load ──→ PostgreSQL
                                                    │
                                         ┌──────────┼──────────┐
                                         ▼          ▼          ▼
                                   ⭐ Star    ❄️ Snowflake  🌌 Galaxy
                                   Schema     Schema       Schema
                                         │          │          │
                                         └──────────┼──────────┘
                                                    ▼
                                             Flask REST API
                                                    │
                                                    ▼
                                          React Dashboard (Vite)
```

## Star Schema

The **Star Schema** keeps all descriptive attributes directly inside each dimension table. This makes queries simpler (fewer JOINs) but stores redundant data.

| Table          | Type      | Description                           |
|----------------|-----------|---------------------------------------|
| `fact_sales`   | Fact      | Order-level sales transactions        |
| `dim_customers`| Dimension | Customer info (name, **country**)     |
| `dim_products` | Dimension | Product info (name, **category**, price) |
| `dim_date`     | Dimension | Date breakdown (year, month, quarter) |

```
               ┌───────────────┐
               │  dim_customers│
               │───────────────│
               │ customer_id   │◄──┐
               │ customer_name │   │
               │ country       │   │
               └───────────────┘   │
                                   │
┌───────────────┐   ┌──────────────┴──────┐   ┌───────────────┐
│   dim_date    │   │     fact_sales      │   │  dim_products │
│───────────────│   │─────────────────────│   │───────────────│
│ date_id       │◄──│ order_id            │──►│ product_id    │
│ full_date     │   │ date_id        (FK) │   │ product_name  │
│ year          │   │ customer_id    (FK) │   │ category      │
│ month         │   │ product_id     (FK) │   │ price         │
│ day           │   │ quantity            │   └───────────────┘
│ quarter       │   │ price               │
│ day_of_week   │   │ total_amount        │
└───────────────┘   └─────────────────────┘
```

## Snowflake Schema

The **Snowflake Schema** further normalizes dimension tables by extracting repeated attributes (like `country` and `category`) into their own **sub-dimension** tables. This reduces data redundancy but requires extra JOINs for queries.

| Table              | Type          | Description                                       |
|--------------------|---------------|---------------------------------------------------|
| `fact_sales_sf`    | Fact          | Order-level sales transactions (same structure)   |
| `dim_customers_sf` | Dimension     | Customer info (name, **country_id** FK)           |
| `dim_products_sf`  | Dimension     | Product info (name, **category_id** FK, price)    |
| `dim_date`         | Dimension     | Date breakdown — shared with star schema          |
| `dim_countries`    | Sub-Dimension | Normalized country lookup (extracted from customers) |
| `dim_categories`   | Sub-Dimension | Normalized category lookup (extracted from products) |

```
┌───────────────┐   ┌─────────────────┐
│ dim_countries │   │ dim_customers_sf│
│───────────────│   │─────────────────│
│ country_id    │◄──│ customer_id     │◄──┐
│ country_name  │   │ customer_name   │   │
└───────────────┘   │ country_id (FK) │   │
                    └─────────────────┘   │
                                          │
┌───────────────┐   ┌─────────────────────┤   ┌─────────────────┐   ┌────────────────┐
│   dim_date    │   │    fact_sales_sf     │   │ dim_products_sf │   │ dim_categories │
│───────────────│   │─────────────────────│   │─────────────────│   │────────────────│
│ date_id       │◄──│ order_id            │──►│ product_id      │──►│ category_id    │
│ full_date     │   │ date_id        (FK) │   │ product_name    │   │ category_name  │
│ year          │   │ customer_id    (FK) │   │ category_id (FK)│   └────────────────┘
│ month         │   │ product_id     (FK) │   │ price           │
│ day           │   │ quantity            │   └─────────────────┘
│ quarter       │   │ price               │
│ day_of_week   │   │ total_amount        │
└───────────────┘   └─────────────────────┘
```

## Galaxy Schema (Fact Constellation)

The **Galaxy Schema** (also called **Fact Constellation**) uses **multiple fact tables** that **share dimension tables**. This is how real-world enterprise data warehouses work — a business tracks many processes (sales, returns, inventory) that all reference the same entities.

| Table                  | Type             | Description                                           |
|------------------------|------------------|-------------------------------------------------------|
| `fact_sales_galaxy`    | Fact (Sales)     | Order-level sales transactions                        |
| `fact_returns_galaxy`  | Fact (Returns)   | Product returns with refund amounts                   |
| `dim_customers`        | Shared Dimension | Customer info — shared by both fact tables             |
| `dim_products`         | Shared Dimension | Product info — shared by both fact tables              |
| `dim_date`             | Shared Dimension | Date breakdown — shared by both fact tables            |
| `dim_return_reasons`   | Unique Dimension | Return reason lookup — only used by returns fact       |

```
                    ┌───────────────┐
                    │  dim_customers│ ◄── SHARED
                    │───────────────│
                    │ customer_id   │◄──────────────┐
                    │ customer_name │               │
                    │ country       │◄───────┐      │
                    └───────────────┘        │      │
                                             │      │
┌───────────────┐   ┌─────────────────────┐  │  ┌───┴─────────────────┐   ┌──────────────────┐
│   dim_date    │   │  fact_sales_galaxy  │  │  │ fact_returns_galaxy │   │dim_return_reasons│
│───────────────│   │─────────────────────│  │  │─────────────────────│   │──────────────────│
│ date_id       │◄──│ order_id            │  │  │ return_id           │──►│ reason_id        │
│ full_date     │   │ date_id        (FK) │  │  │ order_id            │   │ reason_name      │
│ year          │   │ customer_id    (FK) │  │  │ date_id        (FK) │   └──────────────────┘
│ month         │   │ product_id     (FK) │  │  │ customer_id    (FK) │
│ day           │   │ quantity            │  │  │ product_id     (FK) │
│ quarter       │   │ price               │  │  │ quantity_returned   │
│ day_of_week   │◄──│ total_amount        │──┘  │ refund_amount       │
└───────────────┘   └─────────────────────┘     │ reason_id      (FK) │
                              │                 └─────────────────────┘
                              │                           │
                    ┌─────────▼───────┐                   │
                    │  dim_products   │ ◄── SHARED        │
                    │─────────────────│◄──────────────────┘
                    │ product_id      │
                    │ product_name    │
                    │ category        │
                    │ price           │
                    └─────────────────┘
```

## Star vs Snowflake vs Galaxy — Key Differences

| Aspect              | ⭐ Star Schema                    | ❄️ Snowflake Schema                   | 🌌 Galaxy Schema                          |
|---------------------|------------------------------------|----------------------------------------|--------------------------------------------|
| **Fact Tables**     | 1                                  | 1                                      | 2+ (multiple business processes)           |
| **Normalization**   | Denormalized dimensions            | Normalized dimensions (sub-dims)       | Denormalized dims, shared across facts     |
| **JOINs needed**    | Fewest (simplest queries)          | More (extra JOINs to sub-dims)         | Moderate (but cross-fact JOINs possible)   |
| **Redundancy**      | Higher                             | Lowest                                 | Moderate (shared dims reduce duplication)  |
| **Query speed**     | Fastest (fewer JOINs)              | Slower (more JOINs)                    | Depends on query type                      |
| **Cross-process**   | ❌ Not possible                    | ❌ Not possible                        | ✅ Sales vs Returns analysis               |
| **Best for**        | Simple data marts                  | Strict normalization needs             | Enterprise warehouses, multi-process       |

### Example: Sales by Country

**Star Schema** (1 JOIN):
```sql
SELECT c.country, SUM(f.total_amount) AS revenue
FROM fact_sales f
JOIN dim_customers c ON f.customer_id = c.customer_id
GROUP BY c.country;
```

**Snowflake Schema** (2 JOINs):
```sql
SELECT co.country_name AS country, SUM(f.total_amount) AS revenue
FROM fact_sales_sf f
JOIN dim_customers_sf c ON f.customer_id = c.customer_id
JOIN dim_countries co   ON c.country_id  = co.country_id  -- extra JOIN
GROUP BY co.country_name;
```

### Example: Cross-Fact Analysis (Galaxy Only)

**Galaxy Schema** — Revenue vs Refunds by Category:
```sql
WITH sales AS (
    SELECT p.category, SUM(s.total_amount) AS revenue
    FROM fact_sales_galaxy s
    JOIN dim_products p ON s.product_id = p.product_id
    GROUP BY p.category
),
returns AS (
    SELECT p.category, SUM(r.refund_amount) AS refunds
    FROM fact_returns_galaxy r
    JOIN dim_products p ON r.product_id = p.product_id
    GROUP BY p.category
)
SELECT s.category, s.revenue, COALESCE(r.refunds, 0) AS refunds,
       s.revenue - COALESCE(r.refunds, 0) AS net_revenue
FROM sales s LEFT JOIN returns r ON s.category = r.category;
```

## Project Structure

```
DW/
├── config.py              # Database URL & file path settings
├── etl_pipeline.py        # Main ETL pipeline (Extract → Transform → Load)
├── api.py                 # Flask REST API serving analytics data
├── run_queries.py         # Runs analytics queries and prints results
├── queries.sql            # Star + Snowflake + Galaxy SQL queries for reference
├── requirements.txt       # Python dependencies
├── data/
│   └── sales_data.csv     # Sample dataset
├── etl.log                # ETL run log (created after running pipeline)
└── web/                   # React frontend (Vite)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── index.css
        └── components/
            ├── Header.jsx / .css       # Navigation header
            ├── Overview.jsx / .css     # Project overview page
            ├── StarSchema.jsx / .css   # Interactive star schema diagram
            ├── SnowflakeSchema.jsx / .css # Snowflake schema with comparison
            ├── GalaxySchema.jsx / .css # Galaxy schema with cross-fact analysis
            ├── ETLPipeline.jsx / .css  # ETL pipeline visualization & log
            ├── Dashboard.jsx / .css    # Analytics charts & insights
            └── TableExplorer.jsx / .css# Browse table data
```

## Setup & Usage

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Setup PostgreSQL
Make sure PostgreSQL is running, then create the database:
```sql
CREATE DATABASE sales_dw;
```

### 3. Update Config
Edit `config.py` with your PostgreSQL credentials:
```python
DATABASE_URL = "postgresql://your_user:your_password@localhost:5432/sales_dw"
```

### 4. Run ETL Pipeline
```bash
python etl_pipeline.py
```
This creates **all three** schemas (Star, Snowflake, Galaxy) and loads data into all tables.

### 5. Start the Flask API
```bash
python api.py
```
The API will run at `http://localhost:5001`.

### 6. Start the React Dashboard
```bash
cd web
npm install
npm run dev
```
The dashboard will run at `http://localhost:5173`.

### 7. Run Analytics Queries (Optional)
```bash
python run_queries.py
```

## API Endpoints

| Endpoint                         | Description                                |
|----------------------------------|--------------------------------------------|
| **Star Schema**                  |                                            |
| `GET /api/schema`                | Star schema table info & row counts        |
| `GET /api/etl-log`              | ETL pipeline log contents                  |
| `GET /api/sample/<table>`        | First 10 rows of a table                   |
| `GET /api/sales-by-country`      | Total sales aggregated by country          |
| `GET /api/top-products`          | Top 5 products by revenue                  |
| `GET /api/monthly-revenue`       | Monthly revenue trend                      |
| `GET /api/top-customers`         | Top 10 customers by spending               |
| `GET /api/quarterly-category`    | Quarterly revenue by product category      |
| **Snowflake Schema**             |                                            |
| `GET /api/snowflake-schema`      | Snowflake schema table info                |
| `GET /api/snowflake-sample/<t>`  | First 10 rows of a snowflake table         |
| `GET /api/snowflake-sales-by-country` | Sales by country (normalized)         |
| `GET /api/snowflake-top-products`| Top products (normalized)                  |
| `GET /api/snowflake-comparison`  | Star vs Snowflake comparison               |
| **Galaxy Schema**                |                                            |
| `GET /api/galaxy-schema`         | Galaxy schema table info & row counts      |
| `GET /api/galaxy-sample/<table>` | First 10 rows of a galaxy table            |
| `GET /api/galaxy-returns-by-reason` | Returns aggregated by reason            |
| `GET /api/galaxy-returns-by-country`| Returns aggregated by country           |
| `GET /api/galaxy-revenue-vs-returns`| Revenue vs refunds (cross-fact)         |
| `GET /api/galaxy-monthly-returns`| Monthly returns trend                      |
| `GET /api/galaxy-comparison`     | All 3 schemas comparison                   |

## Technologies

- **Python 3.x** — Core language
- **pandas** — Data manipulation and transformation
- **NumPy** — Random data generation for simulated returns
- **SQLAlchemy** — ORM and database connection
- **psycopg2** — PostgreSQL adapter
- **PostgreSQL** — Data warehouse storage (Star + Snowflake + Galaxy schemas)
- **Flask** — REST API backend
- **Flask-CORS** — Cross-origin resource sharing
- **React 19** — Frontend UI library
- **Vite** — Frontend build tool & dev server
- **Recharts** — Charting library for analytics visualizations
