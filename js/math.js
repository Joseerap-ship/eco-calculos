/**
 * EcoCálculos — funciones de econometría y estadística
 */
const EcoMath = (() => {
  function parsePairs(text) {
    const lines = text.trim().split(/\n+/).filter(Boolean);
    const xs = [], ys = [];
    for (const line of lines) {
      const parts = line.split(/[,;\s]+/).map(Number).filter((n) => !Number.isNaN(n));
      if (parts.length < 2) continue;
      xs.push(parts[0]);
      ys.push(parts[1]);
    }
    if (xs.length < 2) throw new Error("Se necesitan al menos 2 pares (X, Y) válidos.");
    return { x: xs, y: ys, n: xs.length };
  }

  function parseSeries(text) {
    const vals = text.trim().split(/\n+/)
      .flatMap((line) => line.split(/[,;\s]+/))
      .map(Number).filter((n) => !Number.isNaN(n));
    if (vals.length < 3) throw new Error("La serie debe tener al menos 3 observaciones.");
    return vals;
  }

  function parseMultiple(text) {
    const lines = text.trim().split(/\n+/).filter(Boolean);
    const rows = [];
    for (const line of lines) {
      const parts = line.split(/[,;\s]+/).map(Number).filter((n) => !Number.isNaN(n));
      if (parts.length < 2) continue;
      rows.push(parts);
    }
    if (rows.length < 3) throw new Error("Se necesitan al menos 3 filas con Y y al menos una X.");
    const cols = rows[0].length;
    if (!rows.every((r) => r.length === cols))
      throw new Error("Todas las filas deben tener el mismo número de columnas.");
    const y = rows.map((r) => r[0]);
    const xCols = [];
    for (let j = 1; j < cols; j++) xCols.push(rows.map((r) => r[j]));
    return { y, xCols, n: rows.length, k: xCols.length };
  }

  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function simpleRegression(x, y) {
    const n = x.length;
    const xBar = mean(x);
    const yBar = mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - xBar, dy = y[i] - yBar;
      sxy += dx * dy;
      sxx += dx * dx;
      syy += dy * dy;
    }
    if (sxx === 0) throw new Error("La variable X no tiene variación.");
    const b1 = sxy / sxx;
    const b0 = yBar - b1 * xBar;
    const fitted = x.map((xi) => b0 + b1 * xi);
    const residuals = y.map((yi, i) => yi - fitted[i]);
    const sse = residuals.reduce((s, e) => s + e * e, 0);
    const sst = syy;
    const r2 = sst === 0 ? 1 : 1 - sse / sst;
    const mse = sse / (n - 2);
    const rmse = Math.sqrt(mse);
    return { b0, b1, fitted, residuals, sse, sst, r2, mse, rmse, n, xBar, yBar, sxy, sxx, syy };
  }

  function normalEquations(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    return { n, sumX, sumY, sumXX, sumXY };
  }

  // Tabla t de Student (aproximación) para intervalos y pruebas
  function tCritical(df, alpha2tail) {
    // Valores comunes precalculados
    const table = {
      0.10: [6.314,2.920,2.353,2.132,2.015,1.943,1.895,1.860,1.833,1.812,1.796,1.782,1.771,1.761,1.753,1.746,1.740,1.734,1.729,1.725,1.721,1.717,1.714,1.711,1.708,1.706,1.703,1.701,1.699,1.697],
      0.05: [12.706,4.303,3.182,2.776,2.571,2.447,2.365,2.306,2.262,2.228,2.201,2.179,2.160,2.145,2.131,2.120,2.110,2.101,2.093,2.086,2.080,2.074,2.069,2.064,2.060,2.056,2.052,2.048,2.045,2.042],
      0.01: [63.657,9.925,5.841,4.604,4.032,3.707,3.499,3.355,3.250,3.169,3.106,3.055,3.012,2.977,2.947,2.921,2.898,2.878,2.861,2.845,2.831,2.819,2.807,2.797,2.787,2.779,2.771,2.763,2.756,2.750],
    };
    const row = table[alpha2tail];
    if (!row) return 1.96;
    if (df <= 0) return row[0];
    if (df <= 30) return row[df - 1];
    if (df <= 40) return alpha2tail === 0.05 ? 2.021 : alpha2tail === 0.01 ? 2.704 : 1.684;
    if (df <= 60) return alpha2tail === 0.05 ? 2.000 : alpha2tail === 0.01 ? 2.660 : 1.671;
    if (df <= 120) return alpha2tail === 0.05 ? 1.980 : alpha2tail === 0.01 ? 2.617 : 1.658;
    return alpha2tail === 0.05 ? 1.960 : alpha2tail === 0.01 ? 2.576 : 1.645;
  }

  function confidenceIntervals(r, confidenceLevel) {
    const alpha = 1 - confidenceLevel / 100;
    const df = r.n - 2;
    const tc = tCritical(df, alpha);
    const sigma = Math.sqrt(r.mse);
    const sqrtSxx = Math.sqrt(r.sxx);

    // IC para β₁
    const seB1 = sigma / sqrtSxx;
    const b1Low = r.b1 - tc * seB1;
    const b1High = r.b1 + tc * seB1;

    // IC para β₀
    const seB0 = sigma * Math.sqrt(1/r.n + (r.xBar**2)/r.sxx);
    const b0Low = r.b0 - tc * seB0;
    const b0High = r.b0 + tc * seB0;

    return { tc, df, alpha, sigma, seB1, seB0, b1Low, b1High, b0Low, b0High, confidenceLevel };
  }

  function hypothesisTest(r, confidenceLevel) {
    const alpha = 1 - confidenceLevel / 100;
    const df = r.n - 2;
    const tc = tCritical(df, alpha);
    const sigma = Math.sqrt(r.mse);
    const sqrtSxx = Math.sqrt(r.sxx);

    // Estadístico t para β₁
    const seB1 = sigma / sqrtSxx;
    const tStatB1 = r.b1 / seB1;

    // Estadístico t para β₀
    const seB0 = sigma * Math.sqrt(1/r.n + (r.xBar**2)/r.sxx);
    const tStatB0 = r.b0 / seB0;

    const rejectB1 = Math.abs(tStatB1) > tc;
    const rejectB0 = Math.abs(tStatB0) > tc;

    return { tStatB1, tStatB0, tc, df, rejectB1, rejectB0, alpha };
  }

  function movingAverage(series, window) {
    const w = Math.max(2, Math.min(window, series.length));
    const ma = [];
    for (let i = 0; i < series.length; i++) {
      if (i < w - 1) { ma.push(null); continue; }
      let sum = 0;
      for (let j = i - w + 1; j <= i; j++) sum += series[j];
      ma.push(sum / w);
    }
    return ma;
  }

  function exponentialSmoothing(series, alpha) {
    const a = Math.max(0.05, Math.min(0.95, alpha));
    const smoothed = [series[0]];
    for (let t = 1; t < series.length; t++)
      smoothed.push(a * series[t] + (1 - a) * smoothed[t - 1]);
    const forecast = a * series[series.length - 1] + (1 - a) * smoothed[smoothed.length - 1];
    return { smoothed, forecast };
  }

  function trendOnTime(series) {
    const t = series.map((_, i) => i + 1);
    const reg = simpleRegression(t, series);
    const trendLine = t.map((ti) => reg.b0 + reg.b1 * ti);
    const nextT = series.length + 1;
    const trendForecast = reg.b0 + reg.b1 * nextT;
    return { reg, trendLine, trendForecast, t };
  }

  function invertMatrix(m) {
    const n = m.length;
    const aug = m.map((row, i) => {
      const identity = new Array(n).fill(0);
      identity[i] = 1;
      return [...row, ...identity];
    });
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let row = col + 1; row < n; row++)
        if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
      if (Math.abs(aug[pivot][col]) < 1e-12)
        throw new Error("La matriz X′X es singular; revisa multicolinealidad.");
      [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
      const div = aug[col][col];
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= div;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
    return aug.map((row) => row.slice(n));
  }

  function multiplyMatrices(a, b) {
    const rows = a.length, cols = b[0].length, inner = b.length;
    const out = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        for (let k = 0; k < inner; k++) out[i][j] += a[i][k] * b[k][j];
    return out;
  }

  function transpose(m) {
    return m[0].map((_, j) => m.map((row) => row[j]));
  }

  function multipleRegression(y, xCols) {
    const n = y.length, k = xCols.length;
    const X = Array.from({ length: n }, (_, i) => [1, ...xCols.map((col) => col[i])]);
    const Y = y.map((v) => [v]);
    const Xt = transpose(X);
    const XtX = multiplyMatrices(Xt, X);
    const XtXinv = invertMatrix(XtX);
    const XtY = multiplyMatrices(Xt, Y);
    const beta = multiplyMatrices(XtXinv, XtY).flat();
    const fitted = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
    const residuals = y.map((yi, i) => yi - fitted[i]);
    const sse = residuals.reduce((s, e) => s + e * e, 0);
    const yBar = mean(y);
    const sst = y.reduce((s, yi) => s + (yi - yBar) ** 2, 0);
    const r2 = sst === 0 ? 1 : 1 - sse / sst;
    const r2Adj = 1 - ((1 - r2) * (n - 1)) / (n - k - 1);
    const mse = sse / (n - k - 1);
    return { beta, fitted, residuals, sse, r2, r2Adj, mse, n, k };
  }

  function fmt(n, d = 4) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: d,
    });
  }

  return {
    parsePairs, parseSeries, parseMultiple,
    simpleRegression, normalEquations,
    confidenceIntervals, hypothesisTest,
    movingAverage, exponentialSmoothing, trendOnTime,
    multipleRegression, fmt,
  };
})();