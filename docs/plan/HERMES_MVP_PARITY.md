# Hermes MVP Parity Checklist

Source: [09_HERMES_COMPATIBILITY.md](../drafts/09_HERMES_COMPATIBILITY.md)

## MVP Parity

| Hermes area | Dore MVP state | Status |
| --- | --- | --- |
| CLI/daemon | Local daemon, doctor, briefing, engineering intake scripts. | Accepted |
| Messaging gateway | Telegram first, allowlisted, daemon-backed commands, notifications. | Accepted |
| Desktop | Electron dashboard operating console. | Accepted |
| Memory | Raw/wiki/operations/logs structure with writer and index. | Accepted |
| Scheduled jobs | Daily 06:00 KST briefing registration and execution handler. | Accepted |
| Tools | Engineering tool registry and controlled command/edit executor. | Accepted |
| Token/cost | Usage records and summary endpoint. | Accepted |
| Trading | Watch/dry-run/paper mode without real broker calls. | Accepted |

## Slash Commands

| Command | MVP surface | Status |
| --- | --- | --- |
| `/new` | Desktop local chat placeholder and workflow task drafting path. | Accepted |
| `/reset` | Desktop local chat reset response; full session reset plan in [SESSION_LIFECYCLE.md](SESSION_LIFECYCLE.md). | Accepted |
| `/model` | Provider status exists; interactive switching is post-MVP. | Deferred |
| `/usage` | Telegram and desktop show usage summary. | Accepted |
| `/skills` | Skill management is post-MVP. | Deferred |
| `/stop` | Telegram cancels or requests cancellation through daemon task API. | Accepted |
| `/status` | Telegram and desktop show daemon status. | Accepted |
| `/sethome` | Post-MVP command. | Deferred |

Deferred items remain non-blocking because M15 accepts local MVP, not full
Hermes feature parity.
