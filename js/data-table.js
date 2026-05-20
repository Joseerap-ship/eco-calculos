/**
 * EcoCálculos — tabla interactiva con pegado desde Excel
 */
class EcoDataTable {
  constructor(container, options = {}) {
    this.el = typeof container === "string" ? document.querySelector(container) : container;
    if (!this.el) throw new Error("Contenedor de tabla no encontrado.");

    this.accent = options.accent || this.el.dataset.accent || "green";
    this.minRows = options.minRows ?? 3;
    this.maxRows = options.maxRows ?? 200;
    this.minXCols = options.minXCols ?? 1;
    this.maxXCols = options.maxXCols ?? 8;
    this.allowAddColumn = options.allowAddColumn ?? false;
    this.showIndex = options.showIndex ?? false;

    this.columns = (options.columns || [{ key: "x", label: "X" }, { key: "y", label: "Y" }]).map((c) => ({
      key: c.key,
      label: c.label,
    }));

    this.rows = [];
    this._buildShell();
    this._bindPaste();
    if (options.initialRows?.length) {
      this.setData(options.initialRows);
    } else {
      for (let i = 0; i < this.minRows; i++) this.addRow();
    }
  }

  _buildShell() {
    this.el.classList.add("idata-wrap");
    this.el.dataset.accent = this.accent;
    this.el.innerHTML = `
      <div class="idata-header-bar"></div>
      <div class="idata-scroll">
        <table class="idata" role="grid">
          <thead></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="idata-footer-bar">
        <button type="button" class="idata-btn idata-btn--add-row" title="Agregar fila">+ Agregar fila</button>
        <button type="button" class="idata-btn idata-btn--clear" title="Vaciar todos los datos">Limpiar tabla</button>
      </div>`;

    this.headerBar = this.el.querySelector(".idata-header-bar");
    this.thead = this.el.querySelector("thead");
    this.tbody = this.el.querySelector("tbody");
    this.addRowBtn = this.el.querySelector(".idata-btn--add-row");
    this.clearBtn = this.el.querySelector(".idata-btn--clear");

    this._renderHead();
    if (this.allowAddColumn) {
      const addCol = document.createElement("button");
      addCol.type = "button";
      addCol.className = "idata-btn idata-btn--add-col";
      addCol.textContent = "+ Variable X";
      addCol.title = "Agregar columna explicativa";
      addCol.addEventListener("click", () => this.addColumn());
      this.headerBar.appendChild(addCol);
    }

    this.addRowBtn.addEventListener("click", () => this.addRow());
    this.clearBtn.addEventListener("click", () => this.clearTable());
  }

  /** Filas vacías tras limpiar (fijo en todas las calculadoras) */
  static CLEAR_ROW_COUNT = 3;

  clearTable() {
    this.rows = [];
    this.tbody.innerHTML = "";
    for (let i = 0; i < EcoDataTable.CLEAR_ROW_COUNT; i++) {
      this.addRow();
    }
    this._renderBody();
    const firstInput = this.tbody.querySelector(".idata-cell");
    firstInput?.focus();
  }

  _renderHead() {
    const colHeaders = this.columns
      .map((c) => `<th scope="col" class="idata-th-data">${this._formatLabel(c.label)}</th>`)
      .join("");
    this.thead.innerHTML = `
      <tr>
        <th scope="col" class="idata-th-actions" aria-label="Acciones"></th>
        ${this.showIndex ? '<th scope="col" class="idata-th-index">#</th>' : ""}
        ${colHeaders}
      </tr>`;
  }

  _formatLabel(label) {
    if (/^X\d+$/.test(label)) return label.replace(/^X(\d+)$/, "X<sub>$1</sub>");
    return label;
  }

  _bindPaste() {
    this.el.addEventListener("paste", (e) => this._onPaste(e));
  }

  _onPaste(e) {
    const target = e.target;
    if (!target.classList?.contains("idata-cell")) return;
    e.preventDefault();
    e.stopPropagation();

    const clipboard = e.clipboardData || window.clipboardData;
    const text = clipboard?.getData("text/plain") ?? "";
    const html = clipboard?.getData("text/html") ?? "";
    if (!text.trim() && !html.trim()) return;

    let grid = text.trim() ? EcoDataTable.parseClipboard(text) : [];
    const htmlGrid = html.trim() ? EcoDataTable.parseFromHtmlTable(html) : null;
    const plainCols = grid.length ? Math.max(...grid.map((r) => r.length)) : 0;
    const htmlCols = htmlGrid?.length ? Math.max(...htmlGrid.map((r) => r.length)) : 0;
    if (htmlGrid?.length && (!grid.length || htmlCols > plainCols)) {
      grid = htmlGrid;
    }
    if (!grid.length) return;

    const startRow = parseInt(target.dataset.row, 10);
    const startCol = parseInt(target.dataset.col, 10);
    const maxPasteCols = Math.max(...grid.map((r) => r.length), 1);

    this._ensureColumnsForPaste(maxPasteCols, startCol);

    const needRows = startRow + grid.length;
    while (this.rows.length < needRows && this.rows.length < this.maxRows) {
      this.addRow();
    }

    grid.forEach((rowVals, ri) => {
      const rowIdx = startRow + ri;
      if (rowIdx >= this.rows.length) return;
      const padded = EcoDataTable.padRow(rowVals, maxPasteCols);
      padded.forEach((val, ci) => {
        const colIdx = startCol + ci;
        if (colIdx < this.columns.length) {
          this.rows[rowIdx].values[colIdx] = EcoDataTable.cleanCell(val);
        }
      });
    });

    this._renderBody();
    const focusRow = Math.min(startRow, this.rows.length - 1);
    const focusCol = Math.min(startCol + maxPasteCols - 1, this.columns.length - 1);
    const focusInput = this.tbody.querySelector(
      `input[data-row="${focusRow}"][data-col="${focusCol}"]`
    );
    focusInput?.focus();
  }

  /**
   * Asegura columnas suficientes desde startCol (pegado respeta la celda activa).
   * Ej.: pegar en Y con 1 columna → solo Y; con 2 columnas desde Y → Y y la siguiente.
   */
  _ensureColumnsForPaste(pasteColCount, startCol) {
    const requiredLength = startCol + pasteColCount;

    if (this.allowAddColumn) {
      let changed = false;
      while (this.columns.length < requiredLength && this.columns.length < this.maxXCols + 1) {
        this.addColumn(false);
        changed = true;
      }
      if (changed) this._renderHead();
      return;
    }

    const slots = this.columns.length - startCol;
    if (pasteColCount > slots) {
      console.warn(
        `EcoCálculos: desde la columna ${startCol + 1} solo caben ${slots} columna(s); se omitió el exceso.`
      );
    }
  }

  static padRow(row, width) {
    const out = row.slice(0, width);
    while (out.length < width) out.push("");
    return out;
  }

  static hasTabularSeparator(text) {
    return text.includes("\t") || (text.includes(";") && text.includes("\n"));
  }

  static parseClipboard(text) {
    const normalized = text
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
    if (!normalized) return [];

    const lines = normalized.split("\n").filter((l) => l.trim().length > 0);

    if (normalized.includes("\t")) {
      return lines.map((line) => line.split("\t").map((cell) => cell.trim()));
    }

    const semiRows = lines.map((line) => line.split(";").map((c) => c.trim()));
    if (semiRows.length > 0 && semiRows.every((r) => r.length > 1)) {
      const cols = semiRows[0].length;
      if (semiRows.every((r) => r.length === cols)) return semiRows;
    }

    if (lines.some((l) => /\s{2,}/.test(l))) {
      return lines.map((line) => line.split(/\s{2,}/).map((c) => c.trim()));
    }

    const commaRows = lines.map((line) => EcoDataTable.splitCsvLine(line));
    const colCount = commaRows[0]?.length ?? 1;
    if (colCount > 1 && commaRows.every((r) => r.length === colCount)) {
      return commaRows;
    }

    return lines.map((l) => [l.trim()]);
  }

  /** Separa por comas solo cuando son separadores de columnas (no decimales 1,5) */
  static splitCsvLine(line) {
    const parts = [];
    let cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ",") {
        const next = line[i + 1];
        const prev = line[i - 1];
        const decimalComma =
          (/\d/.test(prev) && (next === undefined || /\d/.test(next))) ||
          (prev === undefined && /\d/.test(next));
        if (decimalComma) {
          cur += ch;
        } else {
          parts.push(cur.trim());
          cur = "";
        }
      } else {
        cur += ch;
      }
    }
    parts.push(cur.trim());
    return parts.filter((p, i, arr) => p.length > 0 || arr.length === 1);
  }

  static parseFromHtmlTable(text) {
    if (!text.includes("<td") && !text.includes("<TD")) return null;
    try {
      const doc = new DOMParser().parseFromString(text, "text/html");
      const rows = [...doc.querySelectorAll("tr")];
      const grid = rows
        .map((tr) =>
          [...tr.querySelectorAll("td, th")].map((cell) => cell.textContent.trim())
        )
        .filter((r) => r.length > 0);
      return grid.length ? grid : null;
    } catch {
      return null;
    }
  }

  static cleanCell(val) {
    if (val == null) return "";
    return String(val).trim().replace(/\s/g, "").replace(",", ".");
  }

  addColumn(render = true) {
    if (!this.allowAddColumn) return;
    const xCount = this.columns.length - 1;
    if (xCount >= this.maxXCols) return;
    const n = xCount + 1;
    this.columns.push({ key: `x${n}`, label: `X${n}` });
    this.rows.forEach((r) => r.values.push(""));
    if (render) {
      this._renderHead();
      this._renderBody();
    }
  }

  addRow(values) {
    if (this.rows.length >= this.maxRows) return;
    const vals = values
      ? [...values]
      : new Array(this.columns.length).fill("");
    while (vals.length < this.columns.length) vals.push("");
    this.rows.push({ values: vals.slice(0, this.columns.length) });
    this._appendRowDom(this.rows.length - 1);
  }

  removeRow(index) {
    if (this.rows.length <= this.minRows) return;
    this.rows.splice(index, 1);
    this._renderBody();
  }

  _appendRowDom(rowIdx) {
    const row = this.rows[rowIdx];
    const tr = document.createElement("tr");
    tr.dataset.row = rowIdx;

    const tdAct = document.createElement("td");
    tdAct.className = "idata-td-actions";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "idata-del";
    del.innerHTML = "×";
    del.title = "Eliminar fila";
    del.setAttribute("aria-label", "Eliminar fila");
    del.addEventListener("click", () => this.removeRow(rowIdx));
    tdAct.appendChild(del);
    tr.appendChild(tdAct);

    if (this.showIndex) {
      const tdIdx = document.createElement("td");
      tdIdx.className = "idata-td-index";
      tdIdx.textContent = String(rowIdx + 1);
      tr.appendChild(tdIdx);
    }

    this.columns.forEach((col, colIdx) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "idata-cell";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.dataset.row = rowIdx;
      input.dataset.col = colIdx;
      input.dataset.key = col.key;
      input.value = row.values[colIdx] ?? "";
      input.addEventListener("input", () => {
        row.values[colIdx] = input.value;
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    this.tbody.appendChild(tr);
  }

  _renderBody() {
    this.tbody.innerHTML = "";
    this.rows.forEach((_, i) => this._appendRowDom(i));
  }

  setData(matrix) {
    const data = matrix.length ? matrix : [[]];
    if (this.allowAddColumn && data.length) {
      const maxCols = Math.max(...data.map((r) => r.length), this.columns.length);
      this.columns = [{ key: "y", label: "Y" }];
      for (let i = 1; i < maxCols; i++) {
        this.columns.push({ key: `x${i}`, label: `X${i}` });
      }
      this._renderHead();
    }
    this.rows = [];
    this.tbody.innerHTML = "";
    data.forEach((row) => this.addRow(row));
    while (this.rows.length < this.minRows) this.addRow();
  }

  getMatrix() {
    return this.rows.map((r) =>
      r.values.map((v) => {
        const s = EcoDataTable.cleanCell(v);
        if (s === "") return NaN;
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
      })
    );
  }

  /** Regresión / mínimos cuadrados: columnas X e Y */
  getPairs() {
    const keys = this.columns.map((c) => c.key);
    const xi = keys.indexOf("x");
    const yi = keys.indexOf("y");
    const xIdx = xi >= 0 ? xi : 0;
    const yIdx = yi >= 0 ? yi : 1;
    const xs = [];
    const ys = [];
    for (const row of this.getMatrix()) {
      const x = row[xIdx];
      const y = row[yIdx];
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        xs.push(x);
        ys.push(y);
      }
    }
    if (xs.length < 2) throw new Error("Se necesitan al menos 2 filas con X e Y numéricos.");
    return { x: xs, y: ys, n: xs.length };
  }

  /** Series de tiempo: columna Y (o segunda columna) */
  getSeries() {
    const keys = this.columns.map((c) => c.key);
    const yi = keys.indexOf("y");
    const yIdx = yi >= 0 ? yi : keys.length - 1;
    const vals = [];
    for (const row of this.getMatrix()) {
      const y = row[yIdx];
      if (!Number.isNaN(y)) vals.push(y);
    }
    if (vals.length < 3) throw new Error("La serie debe tener al menos 3 valores Y válidos.");
    return vals;
  }

  /** Regresión múltiple: primera columna Y, resto X */
  getMultiple() {
    const matrix = this.getMatrix();
    const rows = matrix.filter((row) => row.every((v) => !Number.isNaN(v)));
    if (rows.length < 3) {
      throw new Error("Se necesitan al menos 3 filas completas con Y y todas las X.");
    }
    const y = rows.map((r) => r[0]);
    const xCols = [];
    for (let j = 1; j < rows[0].length; j++) {
      xCols.push(rows.map((r) => r[j]));
    }
    if (xCols.length < 1) throw new Error("Agrega al menos una variable X.");
    return { y, xCols, n: rows.length, k: xCols.length };
  }
}

window.EcoDataTable = EcoDataTable;
