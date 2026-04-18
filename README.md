# Sales Data Warehouse — ETL Pipeline & Dashboard

A full-stack Data Warehouse project featuring a Python ETL pipeline, PostgreSQL star schema, Flask REST API, and an interactive React dashboard built with Vite.

## Architecture

```
CSV File ──→ Extract ──→ Transform ──→ Load ──→ PostgreSQL (Star Schema)
                                                     │
                                             ┌───────┼───────┐
                                             ▼       ▼       ▼
                                        dim_date  dim_     dim_
                                                 customers products
                                             └───────┼───────┘
                                                     ▼
                                               fact_sales
                                                     │
                                                     ▼
                                              Flask REST API
                                                     │
                                                     ▼
                                           React Dashboard (Vite)
```

## Star Schema

| Table          | Type      | Description                          |
|----------------|-----------|--------------------------------------|
| `fact_sales`   | Fact      | Order-level sales transactions       |
| `dim_customers`| Dimension | Customer info (name, country)        |
| `dim_products` | Dimension | Product info (name, category, price) |
| `dim_date`     | Dimension | Date breakdown (year, month, quarter)|

## Project Structure

```
DW/
├── config.py              # Database URL & file path settings
├── etl_pipeline.py        # Main ETL pipeline (Extract → Transform → Load)
├── api.py                 # Flask REST API serving analytics data
├── run_queries.py         # Runs analytics queries and prints results
├── queries.sql            # Raw SQL queries for reference
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
- **PostgreSQL** — Data warehouse storage
- **Flask** — REST API backend
- **Flask-CORS** — Cross-origin resource sharing
- **React 19** — Frontend UI library
- **Vite** — Frontend build tool & dev server
- **Recharts** — Charting library for analytics visualizations
