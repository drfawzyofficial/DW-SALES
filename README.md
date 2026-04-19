# Sales Data Warehouse — ETL Pipeline & Dashboard

A full-stack Data Warehouse project featuring a Python ETL pipeline, PostgreSQL **Star + Snowflake** schemas, Flask REST API, and an interactive React dashboard built with Vite.

## Architecture

```
CSV File ──→ Extract ──→ Transform ──→ Load ──→ PostgreSQL
                                                    │
                                         ┌──────────┴──────────┐
                                         ▼                     ▼
                                   ⭐ Star Schema        ❄️ Snowflake Schema
                                   (denormalized)         (normalized dims)
                                         │                     │
                                         └──────────┬──────────┘
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

## Star vs Snowflake — Key Differences

| Aspect            | ⭐ Star Schema                       | ❄️ Snowflake Schema                        |
|-------------------|--------------------------------------|---------------------------------------------|
| **Normalization** | Denormalized dimensions              | Normalized dimensions (sub-dimensions)      |
| **JOINs needed**  | Fewer (simpler queries)              | More (extra JOINs to sub-dimensions)        |
| **Redundancy**    | Higher (e.g., "USA" stored per row)  | Lower (country stored once in lookup table) |
| **Query speed**   | Faster (fewer JOINs)                 | Slower (more JOINs)                         |
| **Storage**       | More disk space                      | Less disk space                             |
| **Maintenance**   | Easier to understand                 | Better data integrity                       |

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

## Project Structure

```
DW/
├── config.py              # Database URL & file path settings
├── etl_pipeline.py        # Main ETL pipeline (Extract → Transform → Load)
├── api.py                 # Flask REST API serving analytics data
├── run_queries.py         # Runs analytics queries and prints results
├── queries.sql            # Star + Snowflake SQL queries for reference
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
This creates **both** the Star Schema and Snowflake Schema tables, and loads data into all of them.

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

| Endpoint                    | Description                          |
|-----------------------------|--------------------------------------|
| `GET /api/schema`           | Star schema table info & row counts  |
| `GET /api/etl-log`          | ETL pipeline log contents            |
| `GET /api/sample/<table>`   | First 10 rows of a table             |
| `GET /api/sales-by-country` | Total sales aggregated by country    |
| `GET /api/top-products`     | Top 5 products by revenue            |
| `GET /api/monthly-revenue`  | Monthly revenue trend                |
| `GET /api/top-customers`    | Top 10 customers by spending         |
| `GET /api/quarterly-category`| Quarterly revenue by product category|

## Technologies

- **Python 3.x** — Core language
- **pandas** — Data manipulation and transformation
- **SQLAlchemy** — ORM and database connection
- **psycopg2** — PostgreSQL adapter
- **PostgreSQL** — Data warehouse storage (Star + Snowflake schemas)
- **Flask** — REST API backend
- **Flask-CORS** — Cross-origin resource sharing
- **React 19** — Frontend UI library
- **Vite** — Frontend build tool & dev server
- **Recharts** — Charting library for analytics visualizations
