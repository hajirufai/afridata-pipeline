"""Export DuckDB data to JSON files for the static dashboard."""

import json
import duckdb
import logging
from typing import Any

from .config import DB_PATH, DASHBOARD_DATA_DIR, INDICATORS, AFRICAN_COUNTRIES

logger = logging.getLogger(__name__)


def export_all() -> None:
    """Export all dashboard data files."""
    conn = duckdb.connect(str(DB_PATH), read_only=True)
    try:
        _export_country_profiles(conn)
        _export_rankings(conn)
        _export_summary_stats(conn)
        logger.info("All dashboard data exported successfully")
    finally:
        conn.close()


def export_quality_report(report: dict) -> None:
    """Write quality report JSON to dashboard data directory."""
    path = DASHBOARD_DATA_DIR / "quality_report.json"
    with open(path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    logger.info(f"Quality report exported to {path}")


def _export_country_profiles(conn: duckdb.DuckDBPyConnection) -> None:
    """Export comprehensive country profiles with latest values and trends."""
    profiles: dict[str, dict] = {}
    
    # Get country metadata
    countries = conn.execute("""
        SELECT iso3_code, country_name, region, income_level, capital_city, latitude, longitude
        FROM dim_country
    """).fetchall()
    
    for iso3, name, region, income, capital, lat, lng in countries:
        profiles[iso3] = {
            "name": name,
            "iso3": iso3,
            "iso2": AFRICAN_COUNTRIES.get(iso3, {}).get("iso2", ""),
            "region": region,
            "income_level": income or "Unknown",
            "capital_city": capital or "",
            "lat": lat or 0,
            "lng": lng or 0,
            "latest": {},
            "trends": {},
        }
    
    # Get all indicator data grouped by country
    data = conn.execute("""
        SELECT 
            dc.iso3_code,
            di.short_name,
            di.indicator_code,
            dd.year,
            f.value,
            f.yoy_change
        FROM fact_indicators f
        JOIN dim_country dc ON f.country_key = dc.country_key
        JOIN dim_indicator di ON f.indicator_key = di.indicator_key
        JOIN dim_date dd ON f.date_key = dd.date_key
        ORDER BY dc.iso3_code, di.short_name, dd.year
    """).fetchall()
    
    for iso3, short_name, ind_code, year, value, yoy in data:
        if iso3 not in profiles:
            continue
        
        # Build trends
        if short_name not in profiles[iso3]["trends"]:
            profiles[iso3]["trends"][short_name] = []
        if value is not None:
            profiles[iso3]["trends"][short_name].append({
                "year": year,
                "value": round(value, 2) if value else None,
            })
    
    # Set latest values (most recent non-null for each indicator)
    for iso3, profile in profiles.items():
        for short_name, trend in profile["trends"].items():
            if trend:
                profile["latest"][short_name] = trend[-1]["value"]
    
    path = DASHBOARD_DATA_DIR / "country_profiles.json"
    with open(path, "w") as f:
        json.dump(profiles, f, indent=2)
    logger.info(f"Exported {len(profiles)} country profiles")


def _export_rankings(conn: duckdb.DuckDBPyConnection) -> None:
    """Export country rankings for each indicator (most recent year with data)."""
    rankings: dict[str, list] = {}
    
    for code, meta in INDICATORS.items():
        short = meta["short"]
        rows = conn.execute("""
            WITH latest AS (
                SELECT 
                    dc.iso3_code,
                    dc.country_name,
                    f.value,
                    dd.year,
                    ROW_NUMBER() OVER (PARTITION BY dc.iso3_code ORDER BY dd.year DESC) as rn
                FROM fact_indicators f
                JOIN dim_country dc ON f.country_key = dc.country_key
                JOIN dim_indicator di ON f.indicator_key = di.indicator_key
                JOIN dim_date dd ON f.date_key = dd.date_key
                WHERE di.indicator_code = ? AND f.value IS NOT NULL
            )
            SELECT iso3_code, country_name, value, year
            FROM latest
            WHERE rn = 1
            ORDER BY value DESC
        """, [code]).fetchall()
        
        ranked = []
        for rank, (iso3, name, value, year) in enumerate(rows, 1):
            ranked.append({
                "rank": rank,
                "country": name,
                "iso3": iso3,
                "value": round(value, 2),
                "year": year,
            })
        rankings[short] = ranked
    
    path = DASHBOARD_DATA_DIR / "rankings.json"
    with open(path, "w") as f:
        json.dump(rankings, f, indent=2)
    logger.info(f"Exported rankings for {len(rankings)} indicators")


def _export_summary_stats(conn: duckdb.DuckDBPyConnection) -> None:
    """Export aggregate summary statistics."""
    summary = {}
    
    for code, meta in INDICATORS.items():
        short = meta["short"]
        row = conn.execute("""
            WITH latest AS (
                SELECT 
                    f.value,
                    dd.year,
                    ROW_NUMBER() OVER (PARTITION BY dc.iso3_code ORDER BY dd.year DESC) as rn
                FROM fact_indicators f
                JOIN dim_country dc ON f.country_key = dc.country_key
                JOIN dim_indicator di ON f.indicator_key = di.indicator_key
                JOIN dim_date dd ON f.date_key = dd.date_key
                WHERE di.indicator_code = ? AND f.value IS NOT NULL
            )
            SELECT 
                AVG(value) as avg_val,
                MIN(value) as min_val,
                MAX(value) as max_val,
                MEDIAN(value) as median_val,
                COUNT(*) as country_count
            FROM latest WHERE rn = 1
        """, [code]).fetchone()
        
        summary[short] = {
            "name": meta["name"],
            "category": meta["category"],
            "unit": meta["unit"],
            "avg": round(row[0], 2) if row[0] else None,
            "min": round(row[1], 2) if row[1] else None,
            "max": round(row[2], 2) if row[2] else None,
            "median": round(row[3], 2) if row[3] else None,
            "countries": row[4],
        }
    
    # Total Africa GDP
    total_gdp = conn.execute("""
        WITH latest AS (
            SELECT f.value,
                ROW_NUMBER() OVER (PARTITION BY dc.iso3_code ORDER BY dd.year DESC) as rn
            FROM fact_indicators f
            JOIN dim_country dc ON f.country_key = dc.country_key
            JOIN dim_indicator di ON f.indicator_key = di.indicator_key
            JOIN dim_date dd ON f.date_key = dd.date_key
            WHERE di.indicator_code = 'NY.GDP.MKTP.CD' AND f.value IS NOT NULL
        )
        SELECT SUM(value) FROM latest WHERE rn = 1
    """).fetchone()[0]
    
    total_pop = conn.execute("""
        WITH latest AS (
            SELECT f.value,
                ROW_NUMBER() OVER (PARTITION BY dc.iso3_code ORDER BY dd.year DESC) as rn
            FROM fact_indicators f
            JOIN dim_country dc ON f.country_key = dc.country_key
            JOIN dim_indicator di ON f.indicator_key = di.indicator_key
            JOIN dim_date dd ON f.date_key = dd.date_key
            WHERE di.indicator_code = 'SP.POP.TOTL' AND f.value IS NOT NULL
        )
        SELECT SUM(value) FROM latest WHERE rn = 1
    """).fetchone()[0]
    
    summary["_africa_totals"] = {
        "total_gdp": round(total_gdp, 0) if total_gdp else 0,
        "total_population": round(total_pop, 0) if total_pop else 0,
        "countries_tracked": len(AFRICAN_COUNTRIES),
        "indicators_tracked": len(INDICATORS),
    }
    
    path = DASHBOARD_DATA_DIR / "summary_stats.json"
    with open(path, "w") as f:
        json.dump(summary, f, indent=2)
    logger.info("Exported summary statistics")
