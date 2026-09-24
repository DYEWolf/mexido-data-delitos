# Análisis — México Visible · Jalisco

Análisis reproducible sobre la evidencia privada de Etapa 2 (`/Users/chris/Documents/seguridad-mexico`).

```
cd analysis
uv sync                      # instala Python 3.12 y dependencias fijadas (uv.lock)
uv run python run.py         # corre todas las piezas
uv run python run.py p2 p5   # solo algunas
```

- `mvj/data.py`: cargadores. Registran el SHA-256 de cada insumo y detienen la corrida si los totales oficiales validados no cuadran.
- `mvj/stats.py`: intervalos exactos de Poisson, suavizado bayesiano empírico (Poisson-Gamma), Lorenz/Gini con bootstrap.
- `pieces/`: una pieza por pregunta; cada archivo declara sus hipótesis y el criterio de refutación antes del cálculo.
- `output/`: resultados agregados (sin datos personales) con procedencia.

Resultados e interpretación: `ANALISIS.md` (referencia consolidada) y `reports/analisis-datos-jalisco.md` (bitácora).
