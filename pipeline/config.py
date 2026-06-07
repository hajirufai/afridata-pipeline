"""Configuration and constants for the AfriData Pipeline."""

import os
from pathlib import Path

# --- Paths ---
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DASHBOARD_DATA_DIR = PROJECT_ROOT / "dashboard" / "data"
DB_PATH = DATA_DIR / "warehouse.duckdb"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
DASHBOARD_DATA_DIR.mkdir(parents=True, exist_ok=True)

# --- World Bank API ---
WB_BASE_URL = "https://api.worldbank.org/v2"
WB_FORMAT = "json"
WB_DATE_RANGE = "2000:2024"
WB_PER_PAGE = 10000  # Max to avoid pagination

# --- Indicators ---
INDICATORS = {
    "NY.GDP.MKTP.CD": {"name": "GDP (current US$)", "category": "Economy", "unit": "US$", "short": "gdp"},
    "NY.GDP.MKTP.KD.ZG": {"name": "GDP Growth (annual %)", "category": "Economy", "unit": "%", "short": "gdp_growth"},
    "SP.POP.TOTL": {"name": "Population", "category": "Demographics", "unit": "count", "short": "population"},
    "FP.CPI.TOTL.ZG": {"name": "Inflation (CPI, annual %)", "category": "Economy", "unit": "%", "short": "inflation"},
    "SL.UEM.TOTL.ZS": {"name": "Unemployment (% of labor force)", "category": "Labor", "unit": "%", "short": "unemployment"},
    "SP.DYN.LE00.IN": {"name": "Life Expectancy at Birth", "category": "Health", "unit": "years", "short": "life_expectancy"},
    "IT.NET.USER.ZS": {"name": "Internet Users (% of population)", "category": "Technology", "unit": "%", "short": "internet_users"},
    "EG.ELC.ACCS.ZS": {"name": "Access to Electricity (%)", "category": "Infrastructure", "unit": "%", "short": "electricity_access"},
    "SE.ADT.LITR.ZS": {"name": "Literacy Rate (adult %)", "category": "Education", "unit": "%", "short": "literacy_rate"},
    "BX.KLT.DINV.WD.GD.ZS": {"name": "FDI Inflows (% of GDP)", "category": "Investment", "unit": "%", "short": "fdi_inflows"},
}

# Short code → indicator code mapping
SHORT_TO_CODE = {v["short"]: k for k, v in INDICATORS.items()}

# --- African Countries ---
# Sub-Saharan Africa (SSF) + North Africa
# We fetch by region SSF plus individual North African countries
NORTH_AFRICA_CODES = ["DZA", "EGY", "LBY", "MAR", "MRT", "TUN"]

# All 54 African countries (ISO3 codes)
AFRICAN_COUNTRIES = {
    "DZA": {"name": "Algeria", "region": "North Africa", "iso2": "DZ"},
    "AGO": {"name": "Angola", "region": "Central Africa", "iso2": "AO"},
    "BEN": {"name": "Benin", "region": "West Africa", "iso2": "BJ"},
    "BWA": {"name": "Botswana", "region": "Southern Africa", "iso2": "BW"},
    "BFA": {"name": "Burkina Faso", "region": "West Africa", "iso2": "BF"},
    "BDI": {"name": "Burundi", "region": "East Africa", "iso2": "BI"},
    "CPV": {"name": "Cabo Verde", "region": "West Africa", "iso2": "CV"},
    "CMR": {"name": "Cameroon", "region": "Central Africa", "iso2": "CM"},
    "CAF": {"name": "Central African Republic", "region": "Central Africa", "iso2": "CF"},
    "TCD": {"name": "Chad", "region": "Central Africa", "iso2": "TD"},
    "COM": {"name": "Comoros", "region": "East Africa", "iso2": "KM"},
    "COG": {"name": "Congo, Rep.", "region": "Central Africa", "iso2": "CG"},
    "COD": {"name": "Congo, Dem. Rep.", "region": "Central Africa", "iso2": "CD"},
    "CIV": {"name": "Côte d'Ivoire", "region": "West Africa", "iso2": "CI"},
    "DJI": {"name": "Djibouti", "region": "East Africa", "iso2": "DJ"},
    "EGY": {"name": "Egypt", "region": "North Africa", "iso2": "EG"},
    "GNQ": {"name": "Equatorial Guinea", "region": "Central Africa", "iso2": "GQ"},
    "ERI": {"name": "Eritrea", "region": "East Africa", "iso2": "ER"},
    "SWZ": {"name": "Eswatini", "region": "Southern Africa", "iso2": "SZ"},
    "ETH": {"name": "Ethiopia", "region": "East Africa", "iso2": "ET"},
    "GAB": {"name": "Gabon", "region": "Central Africa", "iso2": "GA"},
    "GMB": {"name": "Gambia", "region": "West Africa", "iso2": "GM"},
    "GHA": {"name": "Ghana", "region": "West Africa", "iso2": "GH"},
    "GIN": {"name": "Guinea", "region": "West Africa", "iso2": "GN"},
    "GNB": {"name": "Guinea-Bissau", "region": "West Africa", "iso2": "GW"},
    "KEN": {"name": "Kenya", "region": "East Africa", "iso2": "KE"},
    "LSO": {"name": "Lesotho", "region": "Southern Africa", "iso2": "LS"},
    "LBR": {"name": "Liberia", "region": "West Africa", "iso2": "LR"},
    "LBY": {"name": "Libya", "region": "North Africa", "iso2": "LY"},
    "MDG": {"name": "Madagascar", "region": "East Africa", "iso2": "MG"},
    "MWI": {"name": "Malawi", "region": "East Africa", "iso2": "MW"},
    "MLI": {"name": "Mali", "region": "West Africa", "iso2": "ML"},
    "MRT": {"name": "Mauritania", "region": "West Africa", "iso2": "MR"},
    "MUS": {"name": "Mauritius", "region": "East Africa", "iso2": "MU"},
    "MAR": {"name": "Morocco", "region": "North Africa", "iso2": "MA"},
    "MOZ": {"name": "Mozambique", "region": "East Africa", "iso2": "MZ"},
    "NAM": {"name": "Namibia", "region": "Southern Africa", "iso2": "NA"},
    "NER": {"name": "Niger", "region": "West Africa", "iso2": "NE"},
    "NGA": {"name": "Nigeria", "region": "West Africa", "iso2": "NG"},
    "RWA": {"name": "Rwanda", "region": "East Africa", "iso2": "RW"},
    "STP": {"name": "São Tomé and Príncipe", "region": "Central Africa", "iso2": "ST"},
    "SEN": {"name": "Senegal", "region": "West Africa", "iso2": "SN"},
    "SYC": {"name": "Seychelles", "region": "East Africa", "iso2": "SC"},
    "SLE": {"name": "Sierra Leone", "region": "West Africa", "iso2": "SL"},
    "SOM": {"name": "Somalia", "region": "East Africa", "iso2": "SO"},
    "ZAF": {"name": "South Africa", "region": "Southern Africa", "iso2": "ZA"},
    "SSD": {"name": "South Sudan", "region": "East Africa", "iso2": "SS"},
    "SDN": {"name": "Sudan", "region": "East Africa", "iso2": "SD"},
    "TZA": {"name": "Tanzania", "region": "East Africa", "iso2": "TZ"},
    "TGO": {"name": "Togo", "region": "West Africa", "iso2": "TG"},
    "TUN": {"name": "Tunisia", "region": "North Africa", "iso2": "TN"},
    "UGA": {"name": "Uganda", "region": "East Africa", "iso2": "UG"},
    "ZMB": {"name": "Zambia", "region": "East Africa", "iso2": "ZM"},
    "ZWE": {"name": "Zimbabwe", "region": "East Africa", "iso2": "ZW"},
}

# --- Data Quality Thresholds ---
DQ_THRESHOLDS = {
    "NY.GDP.MKTP.CD": {"min": 1e6, "max": 1e13},
    "NY.GDP.MKTP.KD.ZG": {"min": -50, "max": 100},
    "SP.POP.TOTL": {"min": 10000, "max": 3e9},
    "FP.CPI.TOTL.ZG": {"min": -30, "max": 10000},
    "SL.UEM.TOTL.ZS": {"min": 0, "max": 80},
    "SP.DYN.LE00.IN": {"min": 25, "max": 95},
    "IT.NET.USER.ZS": {"min": 0, "max": 100},
    "EG.ELC.ACCS.ZS": {"min": 0, "max": 100},
    "SE.ADT.LITR.ZS": {"min": 0, "max": 100},
    "BX.KLT.DINV.WD.GD.ZS": {"min": -100, "max": 500},
}
