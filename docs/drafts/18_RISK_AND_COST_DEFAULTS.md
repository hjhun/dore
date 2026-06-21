# Risk and Cost Defaults

## 목적

Dore의 trading risk limit과 LLM 비용 한도에 대한 기본값을 정한다.

이 값들은 사용자가 별도로 조정하기 전까지 적용되는 보수적 기본값이다. 실제 계좌 규모와 현금흐름이 확인되면 재설정한다.

## Trading Risk Defaults

### 상태별 정책

#### MVP

- 실제 주문: 비활성화.
- paper trading: 활성화.
- dry-run journal: 활성화.
- trading signal: 활성화.
- 실제 주문 API 호출: 금지.

#### Pilot Real Trading

실제 주문은 아래 조건을 모두 충족한 뒤 별도 승인으로 켠다.

- 공식 API 문서 확인.
- API 약관 확인.
- 계좌 권한 확인.
- 최소 30일 dry-run journal.
- kill switch 구현.
- Electron Approvals에서 명시 승인.

### 기본 주문 한도

계좌 평가액을 `NAV`라고 한다.

파일럿 실제주문 활성화 시 기본값:

- 1회 주문 최대 금액: `min(NAV * 1%, 100,000 KRW equivalent)`.
- 1일 신규 매수 총액: `min(NAV * 3%, 300,000 KRW equivalent)`.
- 종목당 최대 비중: `NAV * 10%`.
- 신규 종목 첫 진입 비중: `NAV * 2%` 이하.
- 현금 최소 보유 비율: `NAV * 20%`.

### 기본 손실 한도

- 1일 실현+평가 손실 한도: `min(NAV * 1%, 100,000 KRW equivalent)`.
- 1주 손실 한도: `NAV * 3%`.
- 1개월 손실 한도: `NAV * 6%`.

손실 한도 도달 시:

- 신규 주문 중단.
- 미체결 주문 취소 후보 생성.
- Electron Approvals에 risk halt 표시.
- Telegram으로 요약 알림.
- 사용자가 명시적으로 해제하기 전까지 자동 주문 재개 금지.

### 거래 시간

MVP:

- 자동 주문 없음.
- 장 전/장 후 watch와 signal만 생성.

Pilot:

- 국내장: 정규장 시작 후 10분부터 종료 20분 전까지만 주문 후보 생성.
- 미국장: 정규장 시작 후 15분부터 종료 30분 전까지만 주문 후보 생성.
- 장 시작 직후/마감 직전의 급격한 변동 구간은 기본 회피.

### 금지 항목

- 레버리지.
- 공매도.
- 선물/옵션.
- ELW.
- CFD.
- 신용/미수.
- 손실 제한 없는 averaging down.
- 뉴스 단독 근거 즉시 주문.
- 공식 API 없는 GUI/RPA 주문.

## LLM Cost Defaults

### 월 비용 한도

초기 기본값:

- 전체 LLM soft limit: 50 USD/month.
- 전체 LLM hard approval threshold: 100 USD/month.
- background 작업 soft limit: 15 USD/month.
- daily briefing budget: 1 USD/day soft limit.

soft limit 도달 시:

- background summarization은 저비용 모델로 전환.
- deep research, 대규모 코드 분석, 긴 문서 요약은 approval 요청.
- Telegram에는 비용 경고를 보낸다.

hard approval threshold 도달 시:

- 사용자가 승인한 작업만 고비용 모델 사용.
- daily briefing은 compact mode로 전환.

### Provider별 기본 예산

- OpenAI: 전체 예산의 60%.
- Claude: 전체 예산의 25%.
- Gemini: 전체 예산의 15%.

이 비율은 실제 품질과 비용 로그를 보고 조정한다.

### 작업별 모델 사용 정책

- Telegram 빠른 응답: 저비용/빠른 모델 우선.
- Daily briefing 초안: 저비용 모델.
- Daily briefing 최종 합성: 기본 고품질 모델.
- 코드 리뷰/설계 비평: 고품질 모델.
- 대규모 문서 요약: 긴 context에 유리한 provider 선택.
- trading signal 계산: LLM보다 deterministic code 우선, LLM은 설명과 리포트에 사용.

### 토큰 절약 정책

- raw source 전체를 반복 투입하지 않는다.
- source extract와 summary cache를 만든다.
- memory index를 먼저 읽고 관련 문서만 로드한다.
- daily briefing은 전일 대비 diff 중심으로 생성한다.
- 긴 대화는 압축 summary를 만든다.
- 고비용 모델은 최종 판단/합성에만 사용한다.

