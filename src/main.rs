use std::process::ExitCode;

fn main() -> ExitCode {
    dore::cli::run_from_env()
}
