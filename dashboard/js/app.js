/**
 * AfriData Dashboard — Main Application
 * Interactive dashboard for African economic indicators
 */

// ── State ──────────────────────────────────────────────
let DATA = { profiles: {}, rankings: {}, summary: {}, quality: {} };
let MAP = null;
let GEO_LAYER = null;
let CHARTS = {};
const COLORS = [
    '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899',
    '#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48'
];
const INDICATOR_LABELS = {
    gdp: 'GDP (US$)', gdp_growth: 'GDP Growth (%)', population: 'Population',
    inflation: 'Inflation (%)', unemployment: 'Unemployment (%)',
    life_expectancy: 'Life Expectancy (years)', internet_users: 'Internet Users (%)',
    electricity_access: 'Electricity Access (%)', literacy_rate: 'Literacy Rate (%)',
    fdi_inflows: 'FDI Inflows (% GDP)'
};

// ── Initialization ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await loadData();
    renderKPIs();
    renderOverviewCharts();
    initTabs();
    initCompare();
    initRankings();
    initQuality();
});

async function loadData() {
    const [profiles, rankings, summary, quality] = await Promise.all([
        fetch('data/country_profiles.json').then(r => r.json()),
        fetch('data/rankings.json').then(r => r.json()),
        fetch('data/summary_stats.json').then(r => r.json()),
        fetch('data/quality_report.json').then(r => r.json()),
    ]);
    DATA = { profiles, rankings, summary, quality };
}

// ── Theme ──────────────────────────────────────────────
function initTheme() {
    const saved = localStorage.getItem('afridata-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('afridata-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        // Redraw charts for theme
        Object.values(CHARTS).forEach(c => c.update());
    });
}

// ── Tabs ───────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
            const panel = document.getElementById('tab-' + btn.dataset.tab);
            panel.classList.remove('hidden');
            // Lazy-init map
            if (btn.dataset.tab === 'map' && !MAP) initMap();
        });
    });
}

// ── KPI Cards ──────────────────────────────────────────
function renderKPIs() {
    const totals = DATA.summary._africa_totals || {};
    const avgGrowth = DATA.summary.gdp_growth?.avg || 0;
    const avgLife = DATA.summary.life_expectancy?.avg || 0;
    const cards = [
        { label: 'Total Africa GDP', value: formatCurrency(totals.total_gdp), icon: '💰' },
        { label: 'Total Population', value: formatLargeNum(totals.total_population), icon: '👥' },
        { label: 'Avg GDP Growth', value: avgGrowth.toFixed(1) + '%', icon: '📈' },
        { label: 'Avg Life Expectancy', value: avgLife.toFixed(1) + ' yrs', icon: '❤️' },
    ];
    const container = document.getElementById('kpi-cards');
    container.innerHTML = cards.map(c => `
        <div class="kpi-card">
            <div class="flex items-center gap-2">
                <span class="text-xl">${c.icon}</span>
                <div>
                    <div class="kpi-value">${c.value}</div>
                    <div class="kpi-label">${c.label}</div>
                </div>
            </div>
        </div>
    `).join('');

    // Quality badge
    const qs = DATA.quality.overall_score;
    if (qs) {
        document.getElementById('quality-score').textContent = qs;
        document.getElementById('quality-badge').classList.remove('hidden');
    }
}

// ── Overview Charts ────────────────────────────────────
function renderOverviewCharts() {
    chartGDPBar();
    chartPopRegion();
    chartGDPGrowthLine();
    chartScatter();
}

function chartGDPBar() {
    const ranked = (DATA.rankings.gdp || []).slice(0, 15);
    const ctx = document.getElementById('chart-gdp-bar').getContext('2d');
    CHARTS.gdpBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranked.map(r => r.country),
            datasets: [{
                label: 'GDP (Billion US$)',
                data: ranked.map(r => r.value / 1e9),
                backgroundColor: ranked.map((_, i) => COLORS[i % COLORS.length] + '99'),
                borderColor: ranked.map((_, i) => COLORS[i % COLORS.length]),
                borderWidth: 1, borderRadius: 4,
            }]
        },
        options: { ...barOpts(), onClick: (_, els) => { if (els[0]) openCountry(ranked[els[0].index].iso3); } }
    });
}

function chartPopRegion() {
    const regions = {};
    Object.values(DATA.profiles).forEach(p => {
        const r = p.region || 'Other';
        regions[r] = (regions[r] || 0) + (p.latest?.population || 0);
    });
    const labels = Object.keys(regions).sort((a,b) => regions[b] - regions[a]);
    const ctx = document.getElementById('chart-pop-region').getContext('2d');
    CHARTS.popRegion = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: labels.map(l => regions[l]), backgroundColor: labels.map((_,i) => COLORS[i % COLORS.length] + 'cc'), borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, color: textColor() } },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + formatLargeNum(ctx.raw) } }
            }
        }
    });
}

function chartGDPGrowthLine() {
    // Average GDP growth across Africa by year
    const yearData = {};
    Object.values(DATA.profiles).forEach(p => {
        (p.trends?.gdp_growth || []).forEach(t => {
            if (!yearData[t.year]) yearData[t.year] = [];
            yearData[t.year].push(t.value);
        });
    });
    const years = Object.keys(yearData).sort();
    const avgs = years.map(y => {
        const vals = yearData[y];
        return vals.reduce((a,b) => a + b, 0) / vals.length;
    });
    const ctx = document.getElementById('chart-gdp-growth-line').getContext('2d');
    CHARTS.gdpGrowth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Avg GDP Growth (%)',
                data: avgs,
                borderColor: COLORS[0],
                backgroundColor: COLORS[0] + '22',
                fill: true, tension: 0.3, pointRadius: 2,
            }]
        },
        options: lineOpts()
    });
}

function chartScatter() {
    const points = [];
    Object.entries(DATA.profiles).forEach(([iso3, p]) => {
        const gdp = p.latest?.gdp;
        const pop = p.latest?.population;
        const le = p.latest?.life_expectancy;
        if (gdp && pop && le) {
            points.push({ x: gdp / pop, y: le, iso3, name: p.name, pop });
        }
    });
    const ctx = document.getElementById('chart-scatter').getContext('2d');
    CHARTS.scatter = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Countries',
                data: points.map(p => ({ x: p.x, y: p.y })),
                backgroundColor: COLORS[2] + '88',
                pointRadius: points.map(p => Math.max(3, Math.sqrt(p.pop / 1e6))),
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'logarithmic', title: { display: true, text: 'GDP per Capita (US$)', color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } },
                y: { title: { display: true, text: 'Life Expectancy (years)', color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const p = points[ctx.dataIndex];
                            return `${p.name}: $${Math.round(p.x).toLocaleString()}/cap, ${p.y.toFixed(1)} yrs`;
                        }
                    }
                }
            },
            onClick: (_, els) => { if (els[0]) openCountry(points[els[0].index].iso3); }
        }
    });
}

// ── Map ────────────────────────────────────────────────
async function initMap() {
    MAP = L.map('map', { scrollWheelZoom: true, zoomControl: true }).setView([2, 20], 3);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 8
    }).addTo(MAP);

    // Load Africa GeoJSON
    const geo = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson').then(r => r.json());
    // Filter to African countries
    const africanIso3 = new Set(Object.keys(DATA.profiles));
    geo.features = geo.features.filter(f => africanIso3.has(f.properties.ISO_A3));

    renderChoropleth(geo, 'gdp');
    document.getElementById('map-indicator').addEventListener('change', (e) => renderChoropleth(geo, e.target.value));
}

function renderChoropleth(geo, indicator) {
    if (GEO_LAYER) MAP.removeLayer(GEO_LAYER);

    const values = {};
    Object.entries(DATA.profiles).forEach(([iso3, p]) => {
        values[iso3] = p.latest?.[indicator] ?? null;
    });
    const nums = Object.values(values).filter(v => v !== null && v !== undefined);
    const min = Math.min(...nums);
    const max = Math.max(...nums);

    GEO_LAYER = L.geoJSON(geo, {
        style: (feature) => {
            const iso3 = feature.properties.ISO_A3;
            const val = values[iso3];
            return {
                fillColor: val != null ? getColor(val, min, max) : '#ccc',
                weight: 1, color: '#fff', fillOpacity: 0.75,
            };
        },
        onEachFeature: (feature, layer) => {
            const iso3 = feature.properties.ISO_A3;
            const profile = DATA.profiles[iso3];
            if (profile) {
                const val = profile.latest?.[indicator];
                layer.bindPopup(`<strong>${profile.name}</strong><br>${INDICATOR_LABELS[indicator]}: ${val != null ? formatValue(val, indicator) : 'N/A'}`);
                layer.on('click', () => openCountry(iso3));
            }
        }
    }).addTo(MAP);

    // Legend
    const legend = document.getElementById('map-legend');
    legend.innerHTML = `
        <span>Low</span>
        <div class="flex-1 h-3 rounded" style="background: linear-gradient(to right, #fee2e2, #fbbf24, #22c55e, #2563eb, #7c3aed)"></div>
        <span>High</span>
        <span class="ml-2">(${INDICATOR_LABELS[indicator]})</span>
    `;
}

function getColor(value, min, max) {
    if (max === min) return '#3b82f6';
    const t = (value - min) / (max - min);
    const colors = [
        [254, 226, 226], [251, 191, 36], [34, 197, 94], [37, 99, 235], [124, 58, 237]
    ];
    const idx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 2);
    const f = t * (colors.length - 1) - idx;
    const r = Math.round(colors[idx][0] + f * (colors[idx+1][0] - colors[idx][0]));
    const g = Math.round(colors[idx][1] + f * (colors[idx+1][1] - colors[idx][1]));
    const b = Math.round(colors[idx][2] + f * (colors[idx+1][2] - colors[idx][2]));
    return `rgb(${r},${g},${b})`;
}

// ── Compare ────────────────────────────────────────────
function initCompare() {
    const sel = document.getElementById('compare-countries');
    const sorted = Object.entries(DATA.profiles).sort((a,b) => a[1].name.localeCompare(b[1].name));
    // Pre-select top 5 by GDP
    const top5 = (DATA.rankings.gdp || []).slice(0, 5).map(r => r.iso3);
    sorted.forEach(([iso3, p]) => {
        const opt = document.createElement('option');
        opt.value = iso3;
        opt.textContent = p.name;
        opt.selected = top5.includes(iso3);
        sel.appendChild(opt);
    });
    const render = () => renderCompare();
    document.getElementById('compare-indicator').addEventListener('change', render);
    sel.addEventListener('change', render);
    render();
}

function renderCompare() {
    const indicator = document.getElementById('compare-indicator').value;
    const selected = Array.from(document.getElementById('compare-countries').selectedOptions).map(o => o.value).slice(0, 6);
    if (CHARTS.compare) CHARTS.compare.destroy();

    const datasets = selected.map((iso3, i) => {
        const trends = DATA.profiles[iso3]?.trends?.[indicator] || [];
        return {
            label: DATA.profiles[iso3]?.name || iso3,
            data: trends.map(t => ({ x: t.year, y: t.value })),
            borderColor: COLORS[i % COLORS.length],
            backgroundColor: COLORS[i % COLORS.length] + '22',
            tension: 0.3, pointRadius: 2, fill: false,
        };
    });

    const ctx = document.getElementById('chart-compare').getContext('2d');
    CHARTS.compare = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', title: { display: true, text: 'Year', color: textColor() }, ticks: { color: textColor(), callback: v => v }, grid: { color: gridColor() } },
                y: { title: { display: true, text: INDICATOR_LABELS[indicator], color: textColor() }, ticks: { color: textColor() }, grid: { color: gridColor() } }
            },
            plugins: { legend: { labels: { color: textColor() } } }
        }
    });
}

// ── Rankings ───────────────────────────────────────────
function initRankings() {
    const render = () => renderRankings();
    document.getElementById('ranking-indicator').addEventListener('change', render);
    render();
}

function renderRankings() {
    const indicator = document.getElementById('ranking-indicator').value;
    const ranked = DATA.rankings[indicator] || [];
    const body = document.getElementById('rankings-body');
    body.innerHTML = ranked.map(r => `
        <tr onclick="openCountry('${r.iso3}')">
            <td class="py-2 px-3 font-mono text-gray-400">${r.rank}</td>
            <td class="py-2 px-3 font-medium">${r.country}</td>
            <td class="py-2 px-3 text-right font-mono">${formatValue(r.value, indicator)}</td>
            <td class="py-2 px-3 text-right text-gray-500">${r.year}</td>
        </tr>
    `).join('');
}

// ── Quality ────────────────────────────────────────────
function initQuality() {
    const q = DATA.quality;
    const dims = q.dimensions || {};
    const cardsHtml = ['completeness', 'validity', 'freshness'].map(dim => {
        const d = dims[dim] || { score: 0 };
        const emoji = d.score >= 80 ? '✅' : d.score >= 50 ? '⚠️' : '❌';
        return `
        <div class="card text-center">
            <div class="text-3xl mb-1">${emoji}</div>
            <div class="text-2xl font-bold">${d.score}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400 capitalize">${dim}</div>
        </div>`;
    }).join('');
    document.getElementById('quality-cards').innerHTML = cardsHtml;

    // Detailed table — merge completeness, validity, freshness by indicator
    const compMap = {}, valMap = {}, freshMap = {};
    (dims.completeness?.details || []).forEach(d => compMap[d.indicator] = d);
    (dims.validity?.details || []).forEach(d => valMap[d.indicator] = d);
    (dims.freshness?.details || []).forEach(d => freshMap[d.indicator] = d);
    const allCodes = new Set([...Object.keys(compMap), ...Object.keys(valMap), ...Object.keys(freshMap)]);
    const body = document.getElementById('quality-details-body');
    body.innerHTML = [...allCodes].map(code => {
        const c = compMap[code] || {};
        const v = valMap[code] || {};
        const f = freshMap[code] || {};
        return `<tr class="border-b border-gray-100 dark:border-gray-700/50">
            <td class="py-2 px-3">${c.name || v.name || f.name || code}</td>
            <td class="py-2 px-3 text-right">${badge(c.completeness_pct, '%')}</td>
            <td class="py-2 px-3 text-right">${badge(v.valid_pct, '%')}</td>
            <td class="py-2 px-3 text-right">${f.latest_year || '—'} ${statusDot(f.status)}</td>
        </tr>`;
    }).join('');
}

function badge(val, suffix) {
    if (val == null) return '—';
    const color = val >= 80 ? 'green' : val >= 50 ? 'yellow' : 'red';
    return `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400">${val}${suffix}</span>`;
}
function statusDot(s) {
    const color = s === 'pass' ? 'green' : s === 'warn' ? 'yellow' : 'red';
    return `<span class="inline-block w-2 h-2 rounded-full bg-${color}-500 ml-1"></span>`;
}

// ── Country Modal ──────────────────────────────────────
function openCountry(iso3) {
    const p = DATA.profiles[iso3];
    if (!p) return;
    const modal = document.getElementById('country-modal');
    document.getElementById('modal-title').textContent = `${p.name}`;
    document.getElementById('modal-meta').innerHTML = `${p.region} · ${p.income_level} · Capital: ${p.capital_city || '—'}`;

    // Indicator grid
    const grid = document.getElementById('modal-indicators');
    const indicators = ['gdp','gdp_growth','population','inflation','unemployment','life_expectancy','internet_users','electricity_access'];
    grid.innerHTML = indicators.map(ind => {
        const val = p.latest?.[ind];
        return `<div class="modal-ind">
            <div class="modal-ind-value">${val != null ? formatValue(val, ind) : 'N/A'}</div>
            <div class="modal-ind-label">${INDICATOR_LABELS[ind]}</div>
        </div>`;
    }).join('');

    // Trend chart (GDP)
    if (CHARTS.modalTrend) CHARTS.modalTrend.destroy();
    const gdpTrend = p.trends?.gdp || [];
    const ctx = document.getElementById('chart-modal-trend').getContext('2d');
    CHARTS.modalTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: gdpTrend.map(t => t.year),
            datasets: [{
                label: 'GDP (Billion US$)',
                data: gdpTrend.map(t => t.value / 1e9),
                borderColor: COLORS[0], backgroundColor: COLORS[0] + '22',
                fill: true, tension: 0.3, pointRadius: 2,
            }]
        },
        options: lineOpts()
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

document.getElementById('modal-close').addEventListener('click', () => {
    const modal = document.getElementById('country-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
});
document.getElementById('country-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
        e.currentTarget.classList.remove('flex');
    }
});

// ── Formatting ─────────────────────────────────────────
function formatCurrency(n) {
    if (!n) return '$0';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    return '$' + n.toLocaleString();
}

function formatLargeNum(n) {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
}

function formatValue(v, indicator) {
    if (v == null) return 'N/A';
    if (['gdp'].includes(indicator)) return formatCurrency(v);
    if (['population'].includes(indicator)) return formatLargeNum(v);
    if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return v.toFixed(1);
}

// ── Chart Options Helpers ──────────────────────────────
function textColor() {
    return document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b';
}
function gridColor() {
    return document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0';
}

function barOpts() {
    return {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: {
            x: { ticks: { color: textColor() }, grid: { color: gridColor() } },
            y: { ticks: { color: textColor(), font: { size: 11 } }, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
    };
}
function lineOpts() {
    return {
        responsive: true, maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: textColor() }, grid: { color: gridColor() } },
            y: { ticks: { color: textColor() }, grid: { color: gridColor() } }
        },
        plugins: { legend: { labels: { color: textColor() } } }
    };
}
