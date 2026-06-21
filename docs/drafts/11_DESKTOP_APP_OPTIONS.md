# Desktop App Options

## 목적

Dore의 데스크톱 앱 기술 선택지를 비교한다.

후보:

- Electron.
- Tauri.
- Native.

## Electron

Electron은 JavaScript, HTML, CSS로 데스크톱 앱을 만드는 프레임워크다. Chromium과 Node.js를 앱에 포함해 Windows, macOS, Linux에서 같은 코드베이스로 동작한다.

### 장점

- 웹 프론트엔드 기술을 그대로 사용할 수 있다.
- React, Vue, Svelte 등 생태계 활용이 쉽다.
- 구현 속도가 빠르다.
- 복잡한 dashboard UI, 로그 뷰어, 설정 화면을 만들기 좋다.
- Hermes도 Electron desktop app을 사용하므로 참고할 자료가 있다.

### 단점

- 앱 크기와 메모리 사용량이 커지는 편이다.
- Chromium과 Node.js를 포함하므로 보안 경계를 신중하게 설계해야 한다.
- 단순한 tray/승인 UI만 필요한 경우에는 과할 수 있다.

### Dore에 맞는 경우

- 빠르게 데스크톱 앱을 만들고 싶다.
- Agent dashboard를 풍부하게 만들고 싶다.
- 웹 UI 코드를 장기적으로 재사용하고 싶다.
- Hermes desktop 구조를 참고하고 싶다.

## Tauri

Tauri는 웹 프론트엔드와 Rust 기반 backend를 조합해 작은 크기의 크로스플랫폼 앱을 만드는 프레임워크다. OS의 native webview를 사용한다.

### 장점

- Electron보다 앱 크기와 메모리 사용량을 줄이기 쉽다.
- 보안과 권한 경계를 더 엄격하게 설계하기 좋다.
- 웹 프론트엔드 기술을 사용할 수 있다.
- Rust로 OS 통합 기능을 견고하게 만들 수 있다.

### 단점

- Rust와 Tauri 권한 모델을 이해해야 한다.
- Electron보다 생태계와 사례가 적을 수 있다.
- OS별 webview 차이를 고려해야 한다.
- 빠른 프로토타입에는 약간의 진입 비용이 있다.

### Dore에 맞는 경우

- 장기적으로 가볍고 안전한 개인 비서 앱을 만들고 싶다.
- 로컬 daemon과 데스크톱 앱 사이의 권한 경계를 엄격하게 두고 싶다.
- Rust 기반 로컬 기능을 받아들일 수 있다.

## Native

Native는 각 OS의 공식 UI 프레임워크로 앱을 만드는 방식이다. Windows 기준으로는 WinUI/Windows App SDK가 대표적인 선택지다.

### 장점

- OS와 가장 자연스럽게 통합된다.
- 성능과 접근성이 좋다.
- tray, 알림, 파일 시스템, 보안 기능 등 OS 기능 접근이 직접적이다.
- Windows 전용 앱이라면 가장 자연스러운 사용자 경험을 만들 수 있다.

### 단점

- Windows/macOS/Linux를 모두 지원하려면 플랫폼별 앱을 따로 만들어야 한다.
- 프론트엔드 코드 재사용성이 낮다.
- 개발 속도가 느려질 수 있다.
- Agent dashboard처럼 UI가 자주 바뀌는 앱에는 초기 비용이 크다.

### Dore에 맞는 경우

- Windows 전용으로 깊게 통합할 계획이다.
- OS native UX와 성능이 최우선이다.
- 크로스플랫폼보다 로컬 PC 통합이 중요하다.

## 비교 요약

| 기준 | Electron | Tauri | Native |
| --- | --- | --- | --- |
| 개발 속도 | 빠름 | 중간 | 느림 |
| 앱 크기 | 큼 | 작음 | 보통 |
| 메모리 사용 | 큼 | 작음 | 작음 |
| 웹 기술 재사용 | 좋음 | 좋음 | 낮음 |
| OS 통합 | 좋음 | 좋음 | 매우 좋음 |
| 보안 경계 | 주의 필요 | 좋음 | 좋음 |
| 크로스플랫폼 | 좋음 | 좋음 | 낮음 |
| 장기 유지보수 | 좋음 | 좋음 | 플랫폼별 부담 |

## Dore 추천

현재 Dore 요구사항은 로컬 상시 실행 daemon, Telegram bot, 데스크톱 앱이 함께 움직이는 구조다. 데스크톱 앱은 Agent 본체가 아니라 상태 확인, 승인, 설정, 로그 확인, memory 탐색 UI에 가깝다.

최종 선택은 Electron이다.

이유:

- 빠른 MVP 구현이 가능하다.
- Hermes desktop 구조를 참고할 수 있다.
- Agent dashboard, 승인 UI, 로그 뷰어, memory explorer 같은 복잡한 화면을 만들기 좋다.
- 웹 프론트엔드 생태계를 그대로 활용할 수 있다.

주의점:

- Electron은 앱 크기와 메모리 사용량이 커질 수 있다.
- Node.js 권한이 강력하므로 보안 경계를 신중하게 설계해야 한다.
- renderer process에는 필요한 기능만 preload API로 노출한다.

## 결정

- Dore desktop app은 Electron으로 제작한다.
- Tauri와 Native는 현재 채택하지 않는다.
- Native는 Windows 전용 깊은 통합이 필요해질 때 재검토한다.
