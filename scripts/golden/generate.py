"""Gera os dados de referência (golden) a partir do código Python ORIGINAL em legacy/streamlit.

Uso (fora do CI; requer pandas, numpy, statsmodels, scikit-learn):
    python scripts/golden/generate.py

Saída: src/services/__golden__/*.json — consumidos pelos testes de paridade (SPEC-FCS-10 etc.).
O módulo `streamlit` é substituído por um stub: só o decorador `st.cache_data` é usado em import.
"""
from __future__ import annotations

import json
import sys
import types
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

REPO = Path(__file__).resolve().parents[2]
LEGACY = REPO / "legacy" / "streamlit" / "demand_forecasting_system"
OUT = REPO / "src" / "services" / "__golden__"
OUT.mkdir(parents=True, exist_ok=True)

# stub do streamlit (cache_data vira identidade)
stub = types.ModuleType("streamlit")
stub.cache_data = lambda *a, **k: (lambda f: f)
sys.modules["streamlit"] = stub
sys.path.insert(0, str(LEGACY))

from src import services  # noqa: E402
from src.data_processor import DataProcessor  # noqa: E402
from src.eda import ExploratoryDataAnalysis  # noqa: E402
from src.evaluator import ForecastEvaluator  # noqa: E402
from src.forecasting import ForecastEngine  # noqa: E402

FREQS = {"D": ("D", 7, 30), "W": ("W", 52, 12), "ME": ("ME", 12, 6)}


def clean(o):
    """JSON seguro: NaN → null, numpy → python, datas → ISO."""
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, np.ndarray):
        return clean(o.tolist())
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return None if np.isnan(o) or np.isinf(o) else float(o)
    if isinstance(o, (pd.Timestamp,)):
        return o.strftime("%Y-%m-%d")
    if isinstance(o, pd.Series):
        return clean(o.tolist())
    if o is pd.NaT:
        return None
    return o


def dump(name, obj):
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(clean(obj), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{name}.json  {path.stat().st_size / 1024:.1f} KB")


raw = services.read_demo_raw()
df = DataProcessor().aplicar_tratamento_padrao(raw)
skus = sorted(df["sku"].unique())

# ---------------------------------------------------------------- séries
series_out = {}
for sku in skus:
    for fr, (code, m, h) in FREQS.items():
        s = services.series_for(df, sku, code)
        entry = {
            "n": len(s), "first": s.index[0], "last": s.index[-1], "sum": float(s.sum()),
            "labels": [d.strftime("%Y-%m-%d") for d in s.index] if fr != "D" else None,
            "values": s.tolist() if fr != "D" else None,
            "head": s.iloc[:5].tolist(), "tail": s.iloc[-5:].tolist(),
            "future": [d.strftime("%Y-%m-%d") for d in services.future_index(s, 5, code)],
        }
        series_out.setdefault(sku, {})[fr] = entry
dump("series", series_out)

# ---------------------------------------------------------------- perfil (EDA)
eda = ExploratoryDataAnalysis(df)
profile_out = {}
for sku in skus:
    ind, classe, motivo = services.profile(df, sku, "W")
    profile_out[sku] = {"indicators": ind, "classe": classe, "motivo": motivo}
dump("profile", profile_out)

# ---------------------------------------------------------------- modelos
models_out = {}
for sku in skus:
    for fr, (code, m, h) in FREQS.items():
        s = services.series_for(df, sku, code)
        res = ForecastEngine.run_all(s, h, m=m)
        per_model = {}
        for nome, (fit, fc) in res.items():
            fit_arr = None if fit is None else np.asarray(fit, dtype=float)
            fc_arr = np.asarray(fc, dtype=float)
            sse = None if fit_arr is None else float(np.nansum((s.values - fit_arr) ** 2))
            ran = services.run_models(s, h, m)[nome]
            per_model[nome] = {
                "fit": fit_arr.tolist() if (fit_arr is not None and fr != "D") else None,
                "fit_head": None if fit_arr is None else fit_arr[:6].tolist(),
                "forecast_raw": fc_arr.tolist(),
                "forecast": ran["forecast"].tolist(),
                "sigma": ran["sigma"],
                "sse": sse,
            }
        models_out.setdefault(sku, {})[fr] = {"h": h, "m": m, "models": per_model, "order": list(res)}
dump("models", models_out)

# ---------------------------------------------------------------- backtest / melhor modelo
bt_out = {}
for sku in skus:
    for fr, (code, m, h) in FREQS.items():
        s = services.series_for(df, sku, code)
        melhor, tabela = services.best_model(s, code)
        h_bt = None
        n = len(s)
        h_bt = min(max(int(n * 0.2), 3), 12)
        h_bt = min(h_bt, max(n - 4, 1))
        explicit_h = h
        met, fcasts, train, test = services.backtest(s, explicit_h, m)
        bt_out.setdefault(sku, {})[fr] = {
            "best": melhor, "h_bt": h_bt,
            "best_table": tabela.to_dict(orient="records"),
            "explicit_h": explicit_h,
            "explicit_table": met.to_dict(orient="records"),
            "explicit_forecasts": {k: v.tolist() for k, v in fcasts.items()},
            "test": test.tolist(),
        }
dump("backtest", bt_out)

# ---------------------------------------------------------------- CPFR (SMA 4) e cenários
cpfr_out = {}
for sku in skus:
    s = services.series_for(df, sku, "W")
    _, fc = ForecastEngine.simple_moving_average(s, 8, window=4)
    cpfr_out[sku] = {"stat": np.round(fc).astype(int).tolist(), "raw": fc.tolist()}
dump("cpfr", cpfr_out)

# ---------------------------------------------------------------- métricas (casos pequenos)
metric_cases = [
    {"real": [10, 20, 30, 40], "pred": [12, 18, 33, 35]},
    {"real": [0, 0, 5, 10], "pred": [1, 0, 4, 12]},
    {"real": [0, 0, 0], "pred": [1, 2, 3]},
    {"real": [100, 100, 100], "pred": [100, 100, 100]},
]
for c in metric_cases:
    c["metrics"] = ForecastEvaluator.calculate_metrics(c["real"], c["pred"])
dump("metrics", metric_cases)

# ---------------------------------------------------------------- dashboard (base inteira)
ultimo = df["data"].max()
r30 = df[df["data"] > ultimo - pd.Timedelta(days=30)]["quantidade_vendida"].sum()
p30 = df[(df["data"] <= ultimo - pd.Timedelta(days=30)) & (df["data"] > ultimo - pd.Timedelta(days=60))]["quantidade_vendida"].sum()
ano = df[df["data"] > ultimo - pd.Timedelta(days=365)]["quantidade_vendida"].sum()
ano_ant = df[(df["data"] <= ultimo - pd.Timedelta(days=365)) & (df["data"] > ultimo - pd.Timedelta(days=730))]["quantidade_vendida"].sum()
mensal = df.set_index("data")["quantidade_vendida"].resample("ME").sum()
mensal = mensal[mensal.index <= ultimo.normalize()]
tempo = df.groupby([pd.Grouper(key="data", freq="ME"), "sku"])["quantidade_vendida"].sum().reset_index()
tempo = tempo[tempo["data"] <= ultimo.normalize()]
pv = tempo.pivot(index="sku", columns="data", values="quantidade_vendida")
idx = pv.div(pv.mean(axis=1), axis=0) * 100
dump("dashboard", {
    "ultimo": ultimo, "r30": r30, "p30": p30, "ano": ano, "ano_ant": ano_ant,
    "por_sku": df.groupby("sku")["quantidade_vendida"].sum().sort_values(ascending=False).to_dict(),
    "diario_media": df.groupby("data")["quantidade_vendida"].sum().mean(),
    "mensal_labels": [d.strftime("%Y-%m-%d") for d in mensal.index], "mensal": mensal.tolist(),
    "intensity_first_sku": idx.iloc[0].tolist(), "intensity_sku": idx.index[0],
})

# ---------------------------------------------------------------- EDA auxiliar (uma série)
sku0 = skus[0]
w = services.series_for(df, sku0, "W")
x = np.arange(len(w))
trend = np.poly1d(np.polyfit(x, w.values, 1))(x)
daily = df.loc[df["sku"] == sku0].set_index("data")["quantidade_vendida"]
dow = daily.groupby(daily.index.dayofweek).mean().reindex(range(7))
piv = daily.resample("ME").sum().to_frame("q")
piv["ano"], piv["mes"] = piv.index.year, piv.index.month
mat = piv.pivot_table(index="ano", columns="mes", values="q", aggfunc="sum").reindex(columns=range(1, 13))
q = w.to_frame("q")
q["tri"] = q.index.quarter
box = {}
for t, g in q.groupby("tri"):
    v = g["q"]
    q1, med, q3 = v.quantile([0.25, 0.5, 0.75])
    box[f"T{t}"] = {"q1": q1, "med": med, "q3": q3, "min": v.min(), "max": v.max()}
dump("eda", {
    "sku": sku0, "rolling8": w.rolling(8, min_periods=1).mean().tolist(), "trend": trend.tolist(),
    "weekday_index": (dow / dow.mean() * 100).tolist(), "monthly_matrix": mat.values.tolist(), "years": [int(a) for a in mat.index],
    "box": box,
})

# ---------------------------------------------------------------- dados sintéticos (validação/tratamento)
synth = pd.DataFrame({
    "SKU": ["A", "A", "A", "B", "B", "C", None],
    "Data": ["2025-01-01", "2025-01-02", "2025-01-02", "2025-01-01", "2025-02-30", "2025-01-03", "2025-01-03"],
    "Quantidade Vendida": [10, -5, 7, np.nan, 3, 4, 9],
})
synth.columns = synth.columns.str.lower().str.replace(" ", "_")
dp = DataProcessor()
alertas = dp.validar_dados(synth.assign(data=synth["data"].replace("2025-02-30", "2025-02-03")))
treated = dp.aplicar_tratamento_padrao(synth.assign(data=synth["data"].replace("2025-02-30", "2025-02-03")))
dump("data", {
    "alertas": {k: (int(v) if not isinstance(v, (bool, list)) else v) for k, v in alertas.items()},
    "treated": [{"sku": r.sku, "data": r.data.strftime("%Y-%m-%d"), "q": float(r.quantidade_vendida)} for r in treated.itertuples()],
})
print("ok")
