"""Publish compact quarterly financials from the SEC's nightly bulk archive."""
import json
import os
import tempfile
import time
import urllib.request
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAGS = {
    "revenue": ["RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "Revenues", "SalesRevenueNet", "SalesRevenueGoodsNet"],
    "operatingIncome": ["OperatingIncomeLoss"],
    "eps": ["EarningsPerShareDiluted"],
    "operatingCashFlow": ["NetCashProvidedByUsedInOperatingActivities"],
    "capex": ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
}
FORMS = {"10-K", "10-K/A", "10-Q", "10-Q/A", "20-F", "20-F/A", "40-F", "40-F/A", "6-K", "6-K/A"}


def days(start, end):
    return (date.fromisoformat(end) - date.fromisoformat(start)).days + 1


def quarter_facts(concept, unit, tag, additive=True):
    intervals = {}
    for point in concept.get("units", {}).get(unit, []):
        if point.get("form") not in FORMS or not point.get("start") or not point.get("end"):
            continue
        if not isinstance(point.get("val"), (int, float)) or point["val"] != point["val"]:
            continue
        key = (point["start"], point["end"])
        intervals.setdefault(key, []).append(point)
    latest = {key: max(rows, key=lambda p: (p.get("filed", ""), p.get("accn", ""))) for key, rows in intervals.items()}
    result = {}
    for (start, end), point in latest.items():
        duration = days(start, end)
        value, derived, previous = point["val"], False, None
        quarter_start = start
        if not 70 <= duration <= 110:
            if not additive or not 150 <= duration <= 385:
                continue
            # Cash flow reports are YTD. Subtract the same fiscal-year YTD prefix,
            # preferring the same filing to preserve restated comparative amounts.
            candidates = []
            for (pstart, pend), versions in intervals.items():
                if pstart != start or pend >= end or not 70 <= days(pend, end) - 1 <= 110:
                    continue
                eligible = [p for p in versions if p.get("filed", "") <= point.get("filed", "")]
                if eligible:
                    candidates.append(max(eligible, key=lambda p: (p.get("accn") == point.get("accn"), p.get("filed", ""))))
            if not candidates:
                continue
            previous = max(candidates, key=lambda p: (p.get("accn") == point.get("accn"), p.get("filed", "")))
            quarter_start = date.fromordinal(date.fromisoformat(previous["end"]).toordinal() + 1).isoformat()
            value -= previous["val"]
            derived = True
        record = {"value": value, "start": quarter_start, "end": end, "tag": tag,
                  "filed": point.get("filed"), "accession": point.get("accn"), "derived": derived}
        if previous:
            record["priorAccession"] = previous.get("accn")
        old = result.get(end)
        if old is None or (not derived, record["filed"] or "") > (not old["derived"], old["filed"] or ""):
            result[end] = record
    return result


def normalize_company(raw, updated_at):
    facts = raw.get("facts", {}).get("us-gaap", {})
    currencies = {}
    for names in TAGS.values():
        for name in names:
            for unit, points in facts.get(name, {}).get("units", {}).items():
                if len(unit) == 3 and unit.isupper():
                    currencies[unit] = currencies.get(unit, 0) + len(points)
    currency = max(currencies, key=currencies.get) if currencies else "USD"
    series = {}
    for key, names in TAGS.items():
        combined = {}
        for tag in names:
            points = quarter_facts(facts.get(tag, {}), currency + "/shares" if key == "eps" else currency,
                                   tag, additive=key != "eps")
            for end, point in points.items():
                # A newer filing wins when a company migrates between taxonomy tags.
                if end not in combined or (point["filed"] or "") > (combined[end]["filed"] or ""):
                    combined[end] = point
        series[key] = combined
    ends = sorted(set().union(*(set(s) for s in series.values())), reverse=True)[:20]
    quarters = []
    for end in ends:
        metrics = {key: values.get(end) for key, values in series.items()}
        starts = [m["start"] for m in metrics.values() if m]
        if not starts:
            continue
        start = max(set(starts), key=starts.count)
        metrics = {key: value if value and value["start"] == start else None for key, value in metrics.items()}
        cfo, capex = metrics["operatingCashFlow"], metrics["capex"]
        metrics["fcf"] = None
        if cfo and capex and capex["value"] >= 0:
            metrics["fcf"] = {**cfo, "value": cfo["value"] - capex["value"], "tag": "operatingCashFlow-capex",
                              "derived": True, "capexAccession": capex["accession"]}
        quarters.append({"start": start, "end": end, "metrics": metrics})
    return {"schemaVersion": 1, "cik": raw["cik"], "name": raw.get("entityName", ""),
            "currency": currency, "updatedAt": updated_at, "quarters": quarters,
            "capexSplit": {"status": "not-standardized", "maintenance": None, "growth": None}}


def request(url):
    agent = os.environ.get("SEC_USER_AGENT")
    if not agent:
        raise RuntimeError("SEC_USER_AGENT must identify this application and a contact address")
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": agent, "Accept-Encoding": "identity"}), timeout=180)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")


def main():
    updated_at = datetime.now(timezone.utc).isoformat()
    with request("https://www.sec.gov/files/company_tickers_exchange.json") as response:
        table = json.load(response)
    rows = [dict(zip(table["fields"], row)) for row in table["data"]]
    rows = [r for r in rows if r.get("exchange") in {"Nasdaq", "NYSE", "CBOE", "NYSE American", "NYSE Arca"}]
    wanted = {int(r["cik"]) for r in rows}
    print(f"Listed securities: {len(rows)}; issuers: {len(wanted)}", flush=True)
    available = {}
    with tempfile.TemporaryDirectory() as directory:
        archive = Path(directory) / "companyfacts.zip"
        time.sleep(1)
        with request("https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip") as response, archive.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        print(f"Downloaded {archive.stat().st_size // 1_000_000} MB official archive", flush=True)
        with zipfile.ZipFile(archive) as source:
            for name in source.namelist():
                stem = Path(name).stem
                if not stem.startswith("CIK") or not stem[3:].isdigit() or int(stem[3:]) not in wanted:
                    continue
                with source.open(name) as entry:
                    normalized = normalize_company(json.load(entry), updated_at)
                cik = normalized["cik"]
                available[cik] = len(normalized["quarters"])
                if normalized["quarters"]:
                    write_json(ROOT / "data" / "companies" / f"{cik}.json", normalized)
    companies = [{"cik": int(r["cik"]), "ticker": r["ticker"], "name": r["name"], "exchange": r["exchange"],
                  "available": bool(available.get(int(r["cik"]))) } for r in rows]
    if not available or not any(available.values()):
        raise RuntimeError("SEC archive produced no quarterly statements; previous data preserved")
    write_json(ROOT / "data" / "companies" / "index.json", {"updatedAt": updated_at, "companies": companies})
    print(f"Published quarterly data for {sum(bool(v) for v in available.values())} issuers", flush=True)


if __name__ == "__main__":
    main()
