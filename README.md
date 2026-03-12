# 🌐 Economic Atlas — 글로벌 경제 대시보드 2025

99개국 경제 데이터를 인터랙티브 세계지도 위에 시각화한 대시보드입니다.

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 📊 경제 지표 | GDP · 무역규모 · 실업률 · 인플레이션율 |
| 🗺️ 지도 오버레이 | NATO · BRICS · G7 · 정치체제 · 천연자원 (석유/가스 생산·수출 TOP10) |
| 💱 실시간 환율 | 원화 기준 주요 8개 통화 (1분마다 갱신) |
| 🛢️ 원자재 시세 | WTI · 브렌트유 · 천연가스 · 금 (5분마다 갱신) |
| 📰 글로벌 뉴스 | Google/BBC/NYT 경제 뉴스 실시간 피드 |
| 🌙 다크/라이트 | 테마 전환 지원 |

## 🚀 배포

GitHub Pages에 `index.html` 하나만 올리면 됩니다.

1. 이 저장소를 GitHub에 생성
2. Settings → Pages → Source: `main` / `/ (root)` → Save
3. `https://유저명.github.io/economic-atlas/` 에서 접속

## 📡 사용 API (모두 무료, 키 불필요)

- **지도 타일**: [CartoDB](https://carto.com/) (dark/light nolabels)
- **국경 데이터**: [Natural Earth TopoJSON](https://github.com/topojson/world-atlas) via jsDelivr
- **환율**: [Frankfurter API](https://www.frankfurter.app/) (ECB 기준)
- **원자재**: [Yahoo Finance](https://finance.yahoo.com/) via allorigins proxy
- **뉴스**: Google News / BBC / NYT RSS via rss2json + allorigins

## 📊 데이터 출처

- IMF World Economic Outlook (Oct 2025)
- EIA / Energy Institute Statistical Review 2025
- USGS Mineral Commodity Summaries 2025
- World Nuclear Association 2024

## 📝 라이선스

MIT License
