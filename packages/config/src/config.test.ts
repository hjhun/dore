import { describe, expect, it } from "vitest";
import { parseConfig } from "./index.js";

describe("config schema", () => {
  it("defaults real trading to disabled", () => {
    const config = parseConfig({
      app: {
        name: "Dore",
        timezone: "Asia/Seoul",
        locale: "ko-KR"
      }
    });

    expect(config.trading.real_trading_enabled).toBe(false);
  });

  it("accepts broker configuration without credentials", () => {
    const config = parseConfig({
      app: {
        name: "Dore",
        timezone: "Asia/Seoul",
        locale: "ko-KR"
      },
      trading: {
        brokers: {
          toss: {
            enabled: true,
            priority: 1,
            mode: "candidate"
          }
        }
      }
    });

    expect(config.trading.brokers.toss.mode).toBe("candidate");
  });

  it("defaults pilot real trading gates to blocking", () => {
    const config = parseConfig({});

    expect(config.trading.real_trading_gates).toMatchObject({
      explicit_enable: false,
      official_api_verified: false,
      terms_verified: false,
      dry_run_min_days: 30,
      dry_run_observed_days: 0,
      kill_switch_enabled: true,
      approval_required: true,
      approval_granted: false
    });
  });

  it("accepts broker credential references without raw secrets", () => {
    const config = parseConfig({
      trading: {
        real_trading_gates: {
          broker_credentials: {
            toss: {
              app_key_secret_ref: "secret_ref:brokers/toss/app_key",
              app_secret_secret_ref: "secret_ref:brokers/toss/app_secret",
              account_secret_ref: "secret_ref:brokers/toss/account"
            }
          }
        }
      }
    });

    expect(config.trading.real_trading_gates.broker_credentials.toss?.app_key_secret_ref).toBe(
      "secret_ref:brokers/toss/app_key"
    );
  });

  it("rejects raw broker credential values", () => {
    expect(() =>
      parseConfig({
        trading: {
          real_trading_gates: {
            broker_credentials: {
              toss: {
                app_key_secret_ref: "plain-value"
              }
            }
          }
        }
      })
    ).toThrow("Broker credential values must be secret_ref references.");
  });

  it("accepts OpenAI workload identity auth configuration without raw tokens", () => {
    const config = parseConfig({
      llm: {
        providers: {
          openai: {
            auth_mode: "workload_identity",
            workload_identity: {
              subject_token_env: "OPENAI_WIF_SUBJECT_TOKEN",
              identity_provider_id_env: "OPENAI_WIF_IDENTITY_PROVIDER_ID",
              service_account_id_env: "OPENAI_WIF_SERVICE_ACCOUNT_ID"
            }
          }
        }
      }
    });

    expect(config.llm.providers.openai.auth_mode).toBe("workload_identity");
    expect(config.llm.providers.openai.workload_identity.subject_token_env).toBe("OPENAI_WIF_SUBJECT_TOKEN");
  });

  it("accepts OpenAI OAuth auth configuration from local auth metadata", () => {
    const config = parseConfig({
      llm: {
        providers: {
          openai: {
            auth_mode: "oauth",
            oauth: {
              token_source: "codex_auth_json",
              codex_auth_file_env: "OPENAI_OAUTH_CODEX_AUTH_FILE"
            }
          }
        }
      }
    });

    expect(config.llm.providers.openai.auth_mode).toBe("oauth");
    expect(config.llm.providers.openai.oauth.token_source).toBe("codex_auth_json");
    expect(config.llm.providers.openai.oauth.codex_auth_file_env).toBe("OPENAI_OAUTH_CODEX_AUTH_FILE");
  });
});
