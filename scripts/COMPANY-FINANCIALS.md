# Company financials

Menu 6 reads `data/company-financials/index.json` and per-symbol JSON snapshots.
It attempts a current TradingView scan on company selection, with a 12-second
timeout and the dated snapshot as fallback. No API keys are shipped to clients.

Run `node scripts/update-company-financials.mjs` to rebuild the listed US stock
and depositary receipt universe. The GitHub workflow runs Monday-Saturday at
09:35 UTC. ETFs are excluded. Unsupported symbols and missing financials are not
invented. The TradingView scanner is an existing site integration, not a
contracted, availability-guaranteed API. Its fields or accessibility may change.

## Interpretation

- Provider-standardized financials, including currency and per-share adjustments.
- CAPEX cash outflows are displayed as positive expenditure.
- Maintenance / growth CAPEX is not available as standardized fields; no split
  is estimated. A future issuer-specific split must include its source and period.
- EPS is diluted EPS; negative bases and zero bases do not get ordinary growth %.
- History arrays retain null slots. Array positions represent provider quarters;
  historical calendar dates are not fabricated.
- Current operating income is available, but historical operating income is not
  included by this endpoint. It accumulates in `operatingIncomeObservations` as
  reporting quarters change. The UI labels missing history explicitly.
- Histories are disabled when quarterly reporting frequency is not confirmed.
- New listings, banks, funds, ADRs and companies with unusual reporting may lack
  some fields or require reading the linked financial statements.

`node --test scripts/company-financials.test.mjs` tests comparison edge cases,
history alignment, sign normalization, and reporting period accumulation.

SEC bulk access returned HTTP 403 locally and on GitHub Actions during setup.
SEC links open the source search; they are not the source of this snapshot.

Vendored UI libraries: Lucide 0.468.0 (ISC) and Chart.js 4.4.8 (MIT). License
notices are included in the distributed files. No build step is required.
