# Daily Briefing Spec

## 목적

Dore는 매일 오전 6시 KST에 사용자가 하루를 시작하는 데 필요한 정보를 모아 정리한다.

이 briefing은 단순 뉴스 요약이 아니라 사용자의 목표, 개발 작업, 투자 watch, 개인 일정, 장기 memory를 결합한 daily operating note다.

## 실행 시간

- 매일 06:00 KST.
- 실패 시 06:10, 06:30에 재시도.
- 07:00까지 실패하면 실패 알림을 보내고 Logs에 기록한다.

## 전달 채널

- Telegram: 짧은 요약.
- Electron Dashboard: 전체 briefing.
- Memory log: briefing 기록.

## 수집 항목

### 개인/업무

- 오늘 일정.
- 오늘 할 일.
- 오래 방치된 작업.
- Dore가 제안하는 오늘의 우선순위.
- 어제 완료한 일.
- 미해결 질문.

### 개발

- 활성 프로젝트 상태.
- 최근 코드 변경.
- 실패한 테스트 또는 미실행 테스트.
- 다음 개발 행동.
- 정리해야 할 아이디어.

### 국내 증시

- 전일 KOSPI/KOSDAQ 흐름.
- 당일 주요 이벤트.
- 관심 종목 watch.
- 보유 종목 risk.
- 거래 가능 API 상태.

### 미국 증시

- 전일 미국장 마감 요약.
- 주요 지수.
- 관심 종목 watch.
- 환율/금리/주요 매크로 이벤트.
- 한국 시간 기준 당일 영향 가능성.

### Agent 운영

- token/cost 사용량.
- 실패한 scheduled job.
- 대기 중 approval.
- memory 업데이트 요약.

## 출력 형식

### Telegram 요약

```text
Dore Morning Briefing - YYYY-MM-DD

1. 오늘 가장 중요한 것
2. 개발/제품
3. 국내 증시
4. 미국 증시
5. 대기 중 승인
6. Dore 제안
```

### Dashboard 상세

- 섹션별 상세 카드.
- 근거 링크.
- 관련 memory 링크.
- action button: approve, snooze, create task, open details.

### Memory 기록

`memory/logs/daily/YYYY-MM-DD.md`에 저장한다.

## 토큰 최적화

- 매일 raw source 전체를 LLM에 넣지 않는다.
- source collector가 구조화 데이터와 짧은 extract를 먼저 만든다.
- 전일 briefing과 변경분만 비교한다.
- 반복 섹션은 template을 사용한다.
- 긴 뉴스/문서는 topic summary로 압축 후 필요할 때만 확장한다.
- background 작업은 저비용 모델 우선 사용.
- 최종 briefing만 고성능 모델로 다듬는다.

## 승인 정책

Daily briefing은 자동 생성/전달한다.

단, briefing 안의 다음 행동은 approval 정책을 따른다.

- 실제 주문.
- 외부 메시지 전송.
- 배포.
- 시스템 변경.
- 대량 파일 수정/삭제.

