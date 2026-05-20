/**
 * EcoCálculos — funciones de econometría y estadística
 */
const EcoMath = (() => {
  function parsePairs(text) {
    const lines = text.trim().split(/\n+/).filter(Boolean);
    const xs = [];
    const ys = [];
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
    const vals = text
      .trim()
      .split(/\n+/)
      .flatMap((line) => line.split(/[,;\s]+/))
      .map(Number)
      .filter((n) => !Number.isNaN(n));
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
    if (!rows.every((r) => r.length === cols)) {
      throw new Error("Todas las filas deben tener el mismo número de columnas (Y, X1, X2, …).");
    }
    const y = rows.map((r) => r[0]);
    const xCols = [];
    for (let j = 1; j < cols; j++) {
      xCols.push(rows.map((r) => r[j]));
    }
    return { y, xCols, n: rows.length, k: xCols.length };
  }

  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function simpleRegression(x, y) {
    const n = x.length;
    const xBar = mean(x);
    const yBar = mean(y);
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - xBar;
      const dy = y[i] - yBar;
      sxy += dx * dy;
      sxx += dx * dx;
      syy += dy * dy;
    }
    if (sxx === 0) throw new Error("La variable X no tiene variación (todos los X son iguales).");
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

  function movingAverage(series, window) {
    const w = Math.max(2, Math.min(window, series.length));
    const ma = [];
    for (let i = 0; i < series.length; i++) {
      if (i < w - 1) {
        ma.push(null);
      } else {
        let sum = 0;
        for (let j = i - w + 1; j <= i; j++) sum += series[j];
        ma.push(sum / w);
      }
    }
    return ma;
  }

  function exponentialSmoothing(series, alpha) {
    const a = Math.max(0.05, Math.min(0.95, alpha));
    const smoothed = [series[0]];
    for (let t = 1; t < series.length; t++) {
      smoothed.push(a * series[t] + (1 - a) * smoothed[t - 1]);
    }
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
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
      }
      if (Math.abs(aug[pivot][col]) < 1e-12) {
        throw new Error("La matriz X′X es singular; revisa multicolinealidad o datos duplicados.");
      }
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
    const rows = a.length;
    const cols = b[0].length;
    const inner = b.length;
    const out = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        for (let k = 0; k < inner; k++) out[i][j] += a[i][k] * b[k][j];
      }
    }
    return out;
  }

  function transpose(m) {
    return m[0].map((_, j) => m.map((row) => row[j]));
  }

  function multipleRegression(y, xCols) {
    const n = y.length;
    const k = xCols.length;
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
    parsePairs,
    parseSeries,
    parseMultiple,
    simpleRegression,
    normalEquations,
    movingAverage,
    exponentialSmoothing,
    trendOnTime,
    multipleRegression,
    fmt,
  };
})();
