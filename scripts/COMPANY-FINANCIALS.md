# Company financials

Menu 6 embeds TradingView's official Fundamental Data and Screener widgets.
The host does not read, extract, cache, transform, or redistribute widget data.
The attribution and original-source links remain visible. Supported symbols,
fields, availability, and update frequency are controlled by the provider.

Ticker shortcuts are hand-maintained; other symbols can be entered with their
exchange. SEC links open filings, not a financial-data API. No API key is used.
There is no automated company-data workflow or published company JSON cache.

The optional calculator accepts user-entered quarterly filing figures only.
It does not read widget contents or persist inputs. Use consistent periods,
currencies and units. CAPEX is a positive expenditure; maintenance/growth CAPEX
is not estimated when issuers do not disclose that split.

Run `node scripts/company-financials.test.mjs` for calculation edge cases and
`node scripts/data-access.test.mjs` for the collection-policy regression check.

## Sources reviewed 2026-09-09

- https://www.tradingview.com/widget-docs/widgets/symbol-details/fundamental-data/
- https://www.tradingview.com/widget-docs/faq/data/
- https://www.tradingview.com/policies/

Official embedding is distinct from permission to download or republish data.
This change is not a legal opinion or a license audit of other site providers.
Future providers require a separate check of public-display and redistribution
rights. Historical Git commits may still contain previously published files;
removing those requires a separately approved history rewrite and cannot recall
copies already downloaded by others.
