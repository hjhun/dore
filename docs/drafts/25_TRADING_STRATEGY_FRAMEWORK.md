# Trading Strategy Framework

## 목적

Dore가 trading signal을 만들고 검증하는 방식을 정의한다.

이 문서는 수익 보장 전략이 아니라, 전략을 안전하게 만들고 검증하기 위한 프레임워크다.

## 기본 철학

- 돈을 많이 벌고 싶다는 목표는 인정한다.
- 하지만 Dore는 검증되지 않은 자동매매로 계좌를 위험에 빠뜨리지 않는다.
- LLM은 수치 계산보다 아이디어 생성, 설명, 리포트에 사용한다.
- 실제 signal 계산과 risk check는 deterministic code로 수행한다.
- 실제 주문 전 dry-run journal과 사후 평가를 축적한다.

## Strategy Lifecycle

```text
idea
  -> hypothesis
  -> rule definition
  -> backtest
  -> dry-run
  -> paper trading
  -> pilot real trading
  -> review
  -> scale or retire
```

## Strategy Template

```yaml
id:
name:
market: korea | us
universe:
timeframe:
entry_rules:
exit_rules:
risk_rules:
data_sources:
expected_behavior:
failure_modes:
status: idea | backtest | dry_run | paper | pilot | active | retired
```

## 허용 전략 후보

### Momentum Watch

- 상대 강도.
- 거래량 증가.
- 신고가/이동평균 돌파.
- 시장 지수와 비교.

### Mean Reversion Watch

- 과도한 단기 하락.
- 장기 추세 유지 조건.
- 손절 기준 필수.

### Portfolio Rebalancing

- 목표 비중 대비 괴리.
- 현금 비율.
- 종목당 최대 비중.

### Event Watch

- 실적 발표.
- 배당/분할/상장 이벤트.
- 금리/FOMC/CPI 등 매크로 이벤트.

### Long-term Thesis Tracker

- 투자 아이디어.
- 실적/뉴스/가격 변화.
- thesis 훼손 여부.

## 금지 또는 기본 비활성 전략

- 손실 제한 없는 물타기.
- 레버리지 자동매매.
- 공매도.
- 파생상품.
- 뉴스 제목만 보고 즉시 진입.
- LLM 단독 판단 주문.
- 공식 API 없는 GUI/RPA 주문.
- 고빈도 단타.

## Signal Object

```yaml
signal_id:
created_at:
market:
symbol:
strategy_id:
direction: buy | sell | hold | reduce | watch
confidence: low | medium | high
reason:
data_timestamp:
source_refs:
risk_check:
recommended_action:
execution_mode: watch | dry_run | paper | real
expires_at:
```

## Risk Check

주문 후보는 아래를 통과해야 한다.

- broker API 사용 가능.
- market open 여부.
- data freshness.
- position limit.
- daily loss limit.
- max order amount.
- cash minimum.
- duplicate order check.
- pending order check.
- kill switch 상태.

하나라도 실패하면 실제 주문 후보가 아니라 watch 또는 dry-run 기록으로만 남긴다.

## Review Cadence

- Daily: signal과 dry-run 결과 확인.
- Weekly: 전략별 성과 요약.
- Monthly: 전략 유지/수정/폐기 결정.
- 30일 dry-run 이후에만 pilot real trading 검토.

## 성과 지표

- win rate.
- average return.
- max drawdown.
- profit factor.
- number of signals.
- skipped due to risk.
- slippage estimate.
- false positive review.

성과 지표가 충분하지 않으면 실제 주문으로 승격하지 않는다.

