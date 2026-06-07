# 🌍 AfriData Pipeline

**A production-grade data engineering project** that extracts economic indicators for all 54 African countries from the World Bank API, transforms and loads them into a DuckDB analytical warehouse with dimensional modeling, runs automated data quality checks, and serves a beautiful interactive dashboard.

[![Daily ETL](https://github.com/hajirufai/afridata-pipeline/actions/workflows/etl.yml/badge.svg)](https://github.com/hajirufai/afridata-pipeline/actions/workflows/etl.yml)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔄 **ETL Pipeline** | Extracts 13,500+ records from World Bank API v2 with retry logic |
| 🏗️ **Star Schema** | Dimensional model in DuckDB (fact + 3 dimensions) |
| ✅ **Data Quality** | Automated completeness, validity, and freshness checks |
| 📊 **Dashboard** | Interactive charts, choropleth map, country profiles |
| 🌙 **Dark Mode** | Full dark/light theme support |
| ⚡ **Daily Refresh** | GitHub Actions cron updates data every morning |

## 📊 Dashboard Preview

The dashboard features:
- **KPI Summary Cards** — Total GDP, population, average growth, life expectancy
- **Choropleth Map** — Color-coded Africa map for any indicator (Leaflet.js)
- **Country Comparison** — Compare up to 6 countries over 25 years
- **Rankings Table** — Sortable rankings across all 10 indicators
- **Quality Scorecard** — Transparency on data completeness and freshness
- **Country Profiles** — Click any country for a detailed modal view

## 🏗️ Architecture

```
┌────────────────────────┐
│   World Bank API v2    │  Free, no auth, 16K+ indicators
└──────────┬─────────────┘
           │ Extract (httpx + retry)
           ▼
┌────────────────────────┐
│   Transform (Python)   │  Clean, enrich, calculate YoY change
└──────────┬─────────────┘
           │ Load
           ▼
┌────────────────────────┐
│   DuckDB Warehouse     │  Star schema: fact_indicators + 3 dims
│   (Dimensional Model)  │
└──────────┬─────────────┘
           │ Export JSON
           ▼
┌────────────────────────┐
│  Static Dashboard      │  HTML + Tailwind + Chart.js + Leaflet
│  (Deployed on Vercel)  │
└────────────────────────┘
```

## 📈 Data Coverage

| Indicator | Category | Unit |
|-----------|----------|------|
| GDP | Economy | US$ |
| GDP Growth | Economy | % annual |
| Population | Demographics | count |
| Inflation (CPI) | Economy | % annual |
| Unemployment | Labor | % of labor force |
| Life Expectancy | Health | years |
| Internet Users | Technology | % of population |
| Electricity Access | Infrastructure | % of population |
| Literacy Rate | Education | % adult |
| FDI Inflows | Investment | % of GDP |

**Coverage:** 54 countries · 10 indicators · 2000–2024 · 13,500 data points

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- pip

### Installation

```bash
git clone https://github.com/hajirufai/afridata-pipeline.git
cd afridata-pipeline
pip install -r requirements.txt
```

### Run the Pipeline

```bash
# Run everything: extract → transform → load → quality → export
python -m pipeline.main all

# Or run individual stages
python -m pipeline.main pipeline   # ETL only
python -m pipeline.main quality    # Quality checks only
python -m pipeline.main export     # Export dashboard JSON only
```

### View the Dashboard

```bash
# Serve the dashboard locally
cd dashboard
python -m http.server 8080
# Open http://localhost:8080
```

## 📁 Project Structure

```
afridata-pipeline/
├── pipeline/                # Python ETL package
│   ├── config.py            # Configuration, constants, country/indicator definitions
│   ├── extract.py           # World Bank API extraction with retry
│   ├── transform.py         # Data transformation & YoY calculation
│   ├── load.py              # DuckDB star schema loading
│   ├── quality.py           # Data quality framework (3 dimensions)
│   ├── export.py            # JSON export for dashboard
│   └── main.py              # CLI entry point
│
├── dashboard/               # Static web dashboard
│   ├── index.html           # Main page (Tailwind + Chart.js + Leaflet)
│   ├── css/styles.css       # Custom styles
│   ├── js/app.js            # Dashboard logic
│   └── data/                # Generated JSON data files
│
├── .github/workflows/
│   └── etl.yml              # Daily GitHub Actions ETL cron
│
└── data/                    # DuckDB warehouse (gitignored)
```

## 🗄️ Dimensional Model

```
dim_country ◄──── fact_indicators ────► dim_indicator
     │                  │
     │                  │
dim_region         dim_date
```

- **fact_indicators**: 13,500 rows (country × indicator × year), plus YoY change
- **dim_country**: 54 African countries with metadata (income level, coordinates, capital)
- **dim_indicator**: 10 economic indicators with categories and units
- **dim_date**: 25 years (2000–2024) with decade grouping

## ✅ Data Quality

The pipeline includes an automated quality framework scoring three dimensions:

| Dimension | What It Checks | Current Score |
|-----------|----------------|---------------|
| **Completeness** | % of non-null values per indicator | 89/100 |
| **Validity** | Values within expected ranges | 100/100 |
| **Freshness** | How recent the latest data is | 99/100 |
| **Overall** | Weighted average | **95.8/100** |

## 🛠️ Tech Stack

- **Python 3.12** — ETL pipeline
- **httpx** — Async-ready HTTP client with retry support
- **DuckDB** — In-process analytical database (blazing fast SQL)
- **Rich** — Beautiful CLI output with tables and progress
- **Chart.js** — Interactive charts and visualizations
- **Leaflet.js** — Choropleth map of Africa
- **Tailwind CSS** — Utility-first styling with dark mode
- **GitHub Actions** — Daily automated data refresh
- **Vercel** — Static site deployment

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

## 👤 Author

**Haji Rufai** — Data Engineer

- GitHub: [@hajirufai](https://github.com/hajirufai)
- LinkedIn: [hajirufai](https://www.linkedin.com/in/hajirufai/)
- Blog: [dev.to/thyalpha001](https://dev.to/thyalpha001)
