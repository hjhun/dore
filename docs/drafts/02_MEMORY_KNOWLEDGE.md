# Memory and Knowledge Design

## 목적

Agent가 매번 원본 자료를 다시 읽고 추론하지 않도록, 개인 장기 기억과 지식 베이스를 누적 관리한다.

## 계층 구조

### 1. Raw Sources

원본 자료 계층이다. Agent는 읽을 수 있지만 임의로 수정하지 않는다.

예시:

- 웹 클리핑.
- PDF.
- 메모 원문.
- 회의록.
- 이메일 내보내기.
- API 응답 스냅샷.
- 거래 내역 원본.
- 코드 저장소.

### 2. Personal Wiki

Agent가 작성하고 유지하는 지식 계층이다.

예시:

- 사용자 프로필.
- 목표와 프로젝트.
- 사람/회사/서비스별 페이지.
- 관심 주제.
- 투자 아이디어.
- 개발 설계 요약.
- 결정 기록.
- 반복 업무 매뉴얼.

### 3. Operational Memory

Agent 실행을 위한 상태 계층이다.

예시:

- 현재 활성 프로젝트.
- 최근 작업.
- 진행 중인 할 일.
- 미해결 질문.
- 알림 예약.
- 자동화 실행 로그.

### 4. Episodic Log

시간순 사건 기록이다.

예시:

- 대화 요약.
- 중요한 결정.
- 파일 변경.
- 주문 실행.
- 실패/오류.
- 사용자의 피드백.

## 추천 디렉터리 구조

```text
memory/
  raw/
  wiki/
    index.md
    profile/
    projects/
    people/
    topics/
    trading/
    engineering/
  operations/
    active_context.md
    tasks.md
    reminders.md
    open_questions.md
  logs/
    agent_log.md
    decisions.md
    trading_log.md
```

상세 schema와 frontmatter 규칙은 [24_MEMORY_SCHEMA.md](24_MEMORY_SCHEMA.md)를 따른다.

## 저장 기준

Agent는 모든 대화를 무조건 저장하지 않는다. 아래 기준에 해당하면 저장한다.

- 사용자의 장기 선호.
- 반복될 가능성이 높은 업무 방식.
- 중요한 목표/계획/결정.
- 향후 제안에 영향을 주는 정보.
- 개발 설계와 운영 정책.
- 투자 전략, 제한 조건, 리스크 성향.

## 업데이트 원칙

- 새 정보가 기존 내용과 충돌하면 덮어쓰지 않고 충돌을 표시한다.
- 오래된 정보는 삭제보다 "superseded" 표시를 우선한다.
- 중요한 변경은 `logs/agent_log.md`에 기록한다.
- 사용자가 민감하다고 지정한 정보는 별도 접근 정책을 적용한다.

## 검색 전략

1. 현재 작업 컨텍스트 확인.
2. wiki index 확인.
3. 관련 페이지 읽기.
4. 필요 시 raw source 확인.
5. 답변 또는 작업 결과 중 장기 가치가 있는 내용을 wiki에 반영.

## 토큰 최적화 전략

- 원본 전체를 매번 프롬프트에 넣지 않는다.
- wiki 요약과 index를 우선 사용한다.
- 큰 파일은 섹션 단위로 읽는다.
- 반복 질문은 정제된 페이지로 승격한다.
- 자주 쓰는 사용자 프로필과 정책은 짧은 operational memory로 유지한다.
- 오래된 로그는 월별/주제별 summary로 압축한다.
