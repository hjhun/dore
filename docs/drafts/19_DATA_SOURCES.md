# Data Sources

## 목적

Dore가 매일 오전 6시 briefing, trading watch, 개발 지원, 개인 memory 업데이트에 사용할 데이터 소스를 정리한다.

## 데이터 소스 원칙

- 공식 API와 신뢰 가능한 원천을 우선한다.
- trading 실행에 직접 영향을 주는 데이터는 출처와 timestamp를 기록한다.
- LLM은 수치 계산의 주체가 아니라 해석/요약/설명 계층으로 사용한다.
- 시세, 손익, 주문 가능 금액은 broker API 또는 검증된 market data source에서 가져온다.
- 웹 뉴스는 투자 판단의 보조 자료로만 사용한다.

## Daily Briefing Sources

### 개인/업무

- Dore task store.
- Dore memory operations.
- local project repository state.
- scheduled jobs.
- approval queue.

### 개발

- Git working tree status.
- 최근 commit/diff.
- test result log.
- active project notes.
- design docs.

### 국내 증시

MVP source 후보:

- KRX 또는 공공 데이터.
- broker market data API.
- 관심 종목 watchlist.
- 보유 종목 정보.
- 환율.
- 주요 경제 일정.

### 미국 증시

MVP source 후보:

- broker market data API.
- 주요 지수 데이터.
- 관심 종목 watchlist.
- 환율.
- 금리/매크로 이벤트.
- 전일 미국장 마감 뉴스.

## Broker Sources

### 토스증권

- 1차 broker connector 후보.
- 공식 Open API 문서와 약관 확보 필요.
- 국내/해외주식 주문, 계좌 조회, 잔고 조회, 주문 가능 금액, 체결 조회 범위를 확인한다.

### 신한증권

- 2차 broker connector 후보.
- 신한 Open API, 신한i indi, 공식 개발 문서를 확인한다.
- Windows 의존성과 자동화 적합성을 검토한다.

### 삼성증권

- MVP에서는 자동 주문 제외.
- 공식 개인용 Open API 확인 전까지 보유 계좌 리포트 또는 수동 참고만 허용한다.
- HTS/DTS/Web trading 자료는 API 자동매매 근거로 사용하지 않는다.

## Source Ingestion

수집 데이터는 세 계층으로 저장한다.

```text
memory/raw/
  market/
  news/
  broker/
  projects/

memory/wiki/
  trading/
  engineering/
  daily/

memory/logs/
  daily/
  trading/
  agent/
```

## 품질 기준

- 가격/잔고/주문 데이터는 timestamp가 있어야 한다.
- source가 불명확한 데이터로 실제 주문하지 않는다.
- 같은 데이터가 여러 source에서 충돌하면 trading signal을 보류한다.
- daily briefing은 source별 freshness를 표시한다.

