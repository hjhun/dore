use chrono::{DateTime, FixedOffset, Utc};
use std::sync::Mutex;

pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<FixedOffset>;
}

/// System clock that returns the wall-clock time in UTC.
#[derive(Debug, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> DateTime<FixedOffset> {
        Utc::now().with_timezone(&FixedOffset::east_opt(0).expect("UTC offset is valid"))
    }
}

/// Deterministic clock for tests. Each call to [`Clock::now`] returns the
/// next pre-seeded timestamp (or the last one repeatedly when exhausted).
pub struct FixedClock {
    moments: Mutex<Vec<DateTime<FixedOffset>>>,
    cursor: Mutex<usize>,
}

impl FixedClock {
    pub fn new(moments: Vec<DateTime<FixedOffset>>) -> Self {
        assert!(
            !moments.is_empty(),
            "FixedClock requires at least one moment"
        );
        Self {
            moments: Mutex::new(moments),
            cursor: Mutex::new(0),
        }
    }

    pub fn from_rfc3339_list(values: &[&str]) -> Self {
        let moments: Vec<DateTime<FixedOffset>> = values
            .iter()
            .map(|s| DateTime::parse_from_rfc3339(s).expect("valid rfc3339 timestamp"))
            .collect();
        Self::new(moments)
    }
}

impl Clock for FixedClock {
    fn now(&self) -> DateTime<FixedOffset> {
        let moments = self.moments.lock().expect("clock mutex poisoned");
        let mut cursor = self.cursor.lock().expect("clock cursor mutex poisoned");
        let idx = (*cursor).min(moments.len() - 1);
        let value = moments[idx];
        *cursor = (*cursor + 1).min(moments.len());
        value
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_clock_advances_through_seeded_moments() {
        let clock = FixedClock::from_rfc3339_list(&[
            "2026-05-07T16:00:00+00:00",
            "2026-05-07T16:00:01+00:00",
        ]);
        assert_eq!(clock.now().to_rfc3339(), "2026-05-07T16:00:00+00:00");
        assert_eq!(clock.now().to_rfc3339(), "2026-05-07T16:00:01+00:00");
        // Exhausted: clock pins to the final moment.
        assert_eq!(clock.now().to_rfc3339(), "2026-05-07T16:00:01+00:00");
    }
}
