# EcoCálculos

Plataforma web educativa de econometría con tema oscuro y acentos neón (verde, rosa y azul eléctrico).

## Contenido

- **Regresión lineal** — estimación β₀, β₁, R² y gráfico de ajuste
- **Mínimos cuadrados** — ecuaciones normales, SSE, tabla de residuos
- **Series de tiempo** — media móvil, suavizado exponencial y tendencia
- **Modelos econométricos** — regresión múltiple OLS con R² ajustado

## Cómo usar

Abre `index.html` en tu navegador (doble clic o servidor local):

```bash
# Opcional: servidor local con Python
python -m http.server 8080
```

Luego visita `http://localhost:8080`.

Ingresa datos en las tablas interactivas o pulsa **Cargar ejemplo**. Puedes pegar bloques desde Excel (Ctrl+V) en cualquier celda.

## Tablas de datos

| Sección | Columnas |
|---------|----------|
| Regresión / Mínimos cuadrados | X, Y |
| Series de tiempo | t, Y |
| Modelos econométricos | Y, X₁, X₂… (+ Variable X) |

Usa **+ Agregar fila** y **×** para gestionar filas. Al pegar desde Excel (Ctrl+V), los datos se colocan desde la celda activa (pegar en **Y** solo llena **Y** si es una columna). **Limpiar tabla** deja 3 filas vacías.
