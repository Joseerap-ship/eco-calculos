/**
 * EcoCálculos — interfaz y gráficos
 */
const EXAMPLES = {
  regresion: [[2,1.2],[3,1.8],[4,2.1],[5,2.9],[6,3.4]],
  series: [[1,120],[2,135],[3,128],[4,142],[5,150],[6,158]],
  econometricos: [[50,30,2],[55,32,2.1],[58,35,1.9],[62,38,2.2],[65,40,2]],
};

let dataTables = {};
const charts = {};

function showResult(el, html, ok = true, extraClass = "") {
  el.innerHTML = html;
  el.hidden = false;
  el.className = "result " + (ok ? "result--ok" : "result--error") + (extraClass ? ` ${extraClass}` : "");
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function makeScatterChart(canvasId, x, y, fitted, accentColor) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  charts[canvasId] = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        { label: "Datos", data: x.map((xi, i) => ({ x: xi, y: y[i] })), backgroundColor: accentColor, pointRadius: 6 },
        { label: "Ajuste OLS", data: x.map((xi, i) => ({ x: xi, y: fitted[i] })), type: "line", borderColor: "#e8d48b", borderWidth: 2, pointRadius: 0, fill: false },
      ],
    },
    options: chartOptions(),
  });
}

function makeSeriesChart(canvasId, series, ma, ses, trend, accentColor) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const labels = series.map((_, i) => `t=${i + 1}`);
  const datasets = [
    { label: "Serie original", data: series, borderColor: accentColor, tension: 0.2, fill: false },
  ];
  if (ma.some((v) => v != null))
    datasets.push({ label: "Media móvil", data: ma, borderColor: "#c9a84c", borderDash: [6,4], tension: 0.2, pointRadius: 2 });
  datasets.push({ label: "Suavizado exponencial", data: ses, borderColor: "#e8d48b", tension: 0.2, pointRadius: 2 });
  if (trend)
    datasets.push({ label: "Tendencia lineal", data: trend, borderColor: "#f0f0f0", borderDash: [2,2], tension: 0, pointRadius: 0 });
  charts[canvasId] = new Chart(ctx, { type: "line", data: { labels, datasets }, options: chartOptions() });
}

function buildDetailedOlsTable(x, y, r) {
  const xBar = r.xBar, yBar = r.yBar;
  const f = (v, d = 4) => EcoMath.fmt(v, d);
  const totals = { y:0, x:0, xy:0, x2:0, yHat:0, eps:0, eps2:0, yDev2:0, xDev2:0 };
  const bodyRows = x.map((xi, i) => {
    const yi = y[i], xy = xi*yi, x2 = xi*xi;
    const yHat = r.fitted[i], eps = r.residuals[i], eps2 = eps*eps;
    const yDev2 = (yi-yBar)**2, xDev2 = (xi-xBar)**2;
    totals.y+=yi; totals.x+=xi; totals.xy+=xy; totals.x2+=x2;
    totals.yHat+=yHat; totals.eps+=eps; totals.eps2+=eps2;
    totals.yDev2+=yDev2; totals.xDev2+=xDev2;
    return `<tr><td>${f(yi)}</td><td>${f(xi)}</td><td>${f(xy)}</td><td>${f(x2)}</td><td>${f(yHat)}</td><td>${f(eps)}</td><td>${f(eps2)}</td><td>${f(yDev2)}</td><td>${f(xDev2)}</td></tr>`;
  }).join("");

  return `
    <div class="detail-table-wrap detail-table-wrap--green">
      <p class="detail-table-title"><strong>Tabla de cálculo detallada</strong>
        <span class="detail-table-meta">Ȳ = ${f(yBar)} · X̄ = ${f(xBar)} · n = ${x.length}</span>
      </p>
      <div class="detail-table-scroll">
        <table class="detail-table detail-table--green">
          <thead><tr>
            <th>Y</th><th>X</th><th>X<sub>i</sub>Y<sub>i</sub></th><th>X<sub>i</sub>²</th>
            <th>Ŷ<sub>i</sub></th><th>ε<sub>i</sub></th><th>ε<sub>i</sub>²</th>
            <th>(Y<sub>i</sub>−Ȳ)²</th><th>(X<sub>i</sub>−X̄)²</th>
          </tr></thead>
          <tbody>${bodyRows}</tbody>
          <tfoot>
            <tr><td colspan="9" class="detail-table-foot-label">Totales (Σ)</td></tr>
            <tr class="detail-table__totals">
              <td>${f(totals.y)}</td><td>${f(totals.x)}</td><td>${f(totals.xy)}</td>
              <td>${f(totals.x2)}</td><td>${f(totals.yHat)}</td><td>${f(totals.eps)}</td>
              <td>${f(totals.eps2)}</td><td>${f(totals.yDev2)}</td><td>${f(totals.xDev2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="detail-table-note">SSE = ${f(r.sse)} · SST = ${f(r.sst)} · Σ(X<sub>i</sub>−X̄)² = ${f(r.sxx)}</p>
    </div>`;
}

function buildConfidenceAndTest(r, confidenceLevel) {
  const ci = EcoMath.confidenceIntervals(r, confidenceLevel);
  const ht = EcoMath.hypothesisTest(r, confidenceLevel);
  const f = (v, d=4) => EcoMath.fmt(v, d);

  return `
    <div class="detail-table-wrap detail-table-wrap--green" style="margin-top:1.25rem">
      <p class="detail-table-title"><strong>Intervalos de Confianza</strong>
        <span class="detail-table-meta">Nivel: ${confidenceLevel}% · α = ${f(ci.alpha)} · t crítico (gl=${ci.df}) = ${f(ci.tc)}</span>
      </p>
      <div class="detail-table-scroll">
        <table class="detail-table detail-table--green">
          <thead><tr><th>Parámetro</th><th>Estimación</th><th>Error estándar</th><th>Límite inferior</th><th>Límite superior</th></tr></thead>
          <tbody>
            <tr><td>β₀ (intercepto)</td><td>${f(r.b0)}</td><td>${f(ci.seB0)}</td><td>${f(ci.b0Low)}</td><td>${f(ci.b0High)}</td></tr>
            <tr><td>β₁ (pendiente)</td><td>${f(r.b1)}</td><td>${f(ci.seB1)}</td><td>${f(ci.b1Low)}</td><td>${f(ci.b1High)}</td></tr>
          </tbody>
        </table>
      </div>
      <p class="detail-table-note">
        IC β₀: [${f(ci.b0Low)} , ${f(ci.b0High)}] · IC β₁: [${f(ci.b1Low)} , ${f(ci.b1High)}]
      </p>
    </div>

    <div class="detail-table-wrap detail-table-wrap--green" style="margin-top:1rem">
      <p class="detail-table-title"><strong>Prueba de Hipótesis</strong>
        <span class="detail-table-meta">H₀: β = 0 vs H₁: β ≠ 0 · t crítico = ±${f(ht.tc)} · gl = ${ht.df}</span>
      </p>
      <div class="detail-table-scroll">
        <table class="detail-table detail-table--green">
          <thead><tr><th>Parámetro</th><th>Estadístico t</th><th>t crítico</th><th>Conclusión</th></tr></thead>
          <tbody>
            <tr>
              <td>β₀</td><td>${f(ht.tStatB0)}</td><td>±${f(ht.tc)}</td>
              <td>${ht.rejectB0 ? '✅ Se rechaza H₀ (β₀ ≠ 0)' : '⚠️ No se rechaza H₀ (β₀ = 0)'}</td>
            </tr>
            <tr>
              <td>β₁</td><td>${f(ht.tStatB1)}</td><td>±${f(ht.tc)}</td>
              <td>${ht.rejectB1 ? '✅ Se rechaza H₀ (β₁ ≠ 0, X es significativa)' : '⚠️ No se rechaza H₀ (β₁ = 0, X no es significativa)'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#8b92a8", font: { family: "Outfit" } } } },
    scales: {
      x: { ticks: { color: "#8b92a8" }, grid: { color: "rgba(255,255,255,0.06)" } },
      y: { ticks: { color: "#8b92a8" }, grid: { color: "rgba(255,255,255,0.06)" } },
    },
  };
}

function runRegresion() {
  const el = document.getElementById("reg-result");
  try {
    const { x, y } = dataTables.reg.getPairs();
    const confidenceLevel = parseInt(document.getElementById("reg-confidence").value) || 95;
    const r = EcoMath.simpleRegression(x, y);
    const ne = EcoMath.normalEquations(x, y);
    const sign = r.b1 >= 0 ? "+" : "−";

    showResult(el, `
      <h4>Regresión Lineal & Mínimos Cuadrados OLS</h4>
      <p class="eq">Ŷ = ${EcoMath.fmt(r.b0)} ${sign} ${EcoMath.fmt(Math.abs(r.b1))}·X</p>

      <div class="result-stats">
        <div class="stat-box"><span>β₀ (intercepto)</span><strong>${EcoMath.fmt(r.b0)}</strong></div>
        <div class="stat-box"><span>β₁ (pendiente)</span><strong>${EcoMath.fmt(r.b1)}</strong></div>
        <div class="stat-box"><span>R²</span><strong>${EcoMath.fmt(r.r2)}</strong></div>
        <div class="stat-box"><span>SSE</span><strong>${EcoMath.fmt(r.sse)}</strong></div>
        <div class="stat-box"><span>MSE</span><strong>${EcoMath.fmt(r.mse)}</strong></div>
        <div class="stat-box"><span>σ = √MSE</span><strong>${EcoMath.fmt(r.rmse)}</strong></div>
        <div class="stat-box"><span>σ² = MSE</span><strong>${EcoMath.fmt(r.mse)}</strong></div>
        <div class="stat-box"><span>√Σ(Xi−X̄)²</span><strong>${EcoMath.fmt(Math.sqrt(r.sxx))}</strong></div>
        <div class="stat-box"><span>n</span><strong>${r.n}</strong></div>
      </div>

      <p><strong>Ecuaciones normales:</strong></p>
      <p class="eq" style="font-size:0.85rem">
        ${ne.n}·β₀ + β₁·(${EcoMath.fmt(ne.sumX)}) = ${EcoMath.fmt(ne.sumY)}<br>
        β₀·(${EcoMath.fmt(ne.sumX)}) + β₁·(${EcoMath.fmt(ne.sumXX)}) = ${EcoMath.fmt(ne.sumXY)}
      </p>

      <p>El modelo explica el <strong>${EcoMath.fmt(r.r2 * 100, 1)}%</strong> de la variabilidad de Y.</p>

      ${buildDetailedOlsTable(x, y, r)}
      ${buildConfidenceAndTest(r, confidenceLevel)}
    `);
    makeScatterChart("chart-regresion", x, y, r.fitted, "#c9a84c");
  } catch (e) {
    showResult(el, `<h4>Error</h4><p>${e.message}</p>`, false);
    destroyChart("chart-regresion");
  }
}

function runSeries() {
  const el = document.getElementById("st-result");
  try {
    const series = dataTables.st.getSeries();
    const window = parseInt(document.getElementById("st-window").value, 10) || 3;
    const alpha = parseFloat(document.getElementById("st-alpha").value) || 0.3;
    const ma = EcoMath.movingAverage(series, window);
    const { smoothed, forecast } = EcoMath.exponentialSmoothing(series, alpha);
    const { reg, trendLine, trendForecast } = EcoMath.trendOnTime(series);
    showResult(el, `
      <h4>Análisis de la serie</h4>
      <div class="result-stats">
        <div class="stat-box"><span>Observaciones</span><strong>${series.length}</strong></div>
        <div class="stat-box"><span>Media</span><strong>${EcoMath.fmt(series.reduce((a,b)=>a+b,0)/series.length)}</strong></div>
        <div class="stat-box"><span>Pronóstico SES (t+1)</span><strong>${EcoMath.fmt(forecast)}</strong></div>
        <div class="stat-box"><span>Pronóstico tendencia</span><strong>${EcoMath.fmt(trendForecast)}</strong></div>
        <div class="stat-box"><span>Pendiente tendencia</span><strong>${EcoMath.fmt(reg.b1)}</strong></div>
      </div>
      <p>Tendencia lineal: <strong>Ŷ = ${EcoMath.fmt(reg.b0)} + ${EcoMath.fmt(reg.b1)}·t</strong></p>
    `);
    makeSeriesChart("chart-series", series, ma, smoothed, trendLine, "#c9a84c");
  } catch (e) {
    showResult(el, `<h4>Error</h4><p>${e.message}</p>`, false);
    destroyChart("chart-series");
  }
}

function runEconometricos() {
  const el = document.getElementById("eco-result");
  try {
    const { y, xCols, n, k } = dataTables.eco.getMultiple();
    const r = EcoMath.multipleRegression(y, xCols);
    const labels = ["β₀ (intercepto)", ...xCols.map((_, i) => `β${i+1} (X${i+1})`)];
    const coefRows = r.beta.map((b, i) => `<tr><td>${labels[i]}</td><td>${EcoMath.fmt(b)}</td></tr>`).join("");
    const eqParts = r.beta.map((b, i) => {
      if (i === 0) return EcoMath.fmt(b);
      const sign = b >= 0 ? " + " : " − ";
      return sign + EcoMath.fmt(Math.abs(b)) + `·X${i}`;
    }).join("");
    showResult(el, `
      <h4>Modelo econométrico estimado</h4>
      <p class="eq">Ŷ = ${eqParts}</p>
      <div class="result-stats">
        <div class="stat-box"><span>R²</span><strong>${EcoMath.fmt(r.r2)}</strong></div>
        <div class="stat-box"><span>R² ajustado</span><strong>${EcoMath.fmt(r.r2Adj)}</strong></div>
        <div class="stat-box"><span>SSE</span><strong>${EcoMath.fmt(r.sse)}</strong></div>
        <div class="stat-box"><span>MSE</span><strong>${EcoMath.fmt(r.mse)}</strong></div>
        <div class="stat-box"><span>n</span><strong>${n}</strong></div>
        <div class="stat-box"><span>Variables X</span><strong>${k}</strong></div>
      </div>
      <table>
        <thead><tr><th>Parámetro</th><th>Estimación</th></tr></thead>
        <tbody>${coefRows}</tbody>
      </table>
    `);
  } catch (e) {
    showResult(el, `<h4>Error</h4><p>${e.message}</p>`, false);
  }
}

function initDataTables() {
  dataTables = {
    reg: new EcoDataTable("#reg-grid", {
      accent: "green",
      columns: [{ key: "x", label: "X" }, { key: "y", label: "Y" }],
      minRows: 4,
      initialRows: EXAMPLES.regresion,
    }),
    st: new EcoDataTable("#st-grid", {
      accent: "blue",
      columns: [{ key: "t", label: "t" }, { key: "y", label: "Y" }],
      minRows: 5,
      initialRows: EXAMPLES.series,
    }),
    eco: new EcoDataTable("#eco-grid", {
      accent: "green",
      allowAddColumn: true,
      columns: [{ key: "y", label: "Y" }, { key: "x1", label: "X1" }, { key: "x2", label: "X2" }],
      minRows: 4,
      initialRows: EXAMPLES.econometricos,
    }),
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initDataTables();

  document.getElementById("btn-regresion")?.addEventListener("click", runRegresion);
  document.getElementById("btn-series")?.addEventListener("click", runSeries);
  document.getElementById("btn-econometricos")?.addEventListener("click", runEconometricos);

  document.querySelectorAll(".load-example").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.table;
      const key = btn.dataset.example;
      if (id && dataTables[id] && EXAMPLES[key]) dataTables[id].setData(EXAMPLES[key]);
    });
  });

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });
  nav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));
});