# Security Policy

## Supported versions

Ohana is pre-1.0. Security fixes are applied to the latest released minor version
and `main`.

| Version | Supported |
|---------|-----------|
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

- Preferred: use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
  (Security tab → "Report a vulnerability").
- Alternatively, email **vinesh.shampoor@blue5green.com** with details and, if
  possible, a minimal reproduction.

We aim to acknowledge reports within 72 hours and to ship a fix or mitigation
plan within 30 days, coordinating disclosure with the reporter.

## Scope notes

Ohana executes a third-party Agent Script toolchain (`@agentscript/agentforce`)
and reads project `.agent`, scenario, and fixture files. Treat untrusted
`.agent`/scenario inputs as you would any untrusted code the toolchain parses.
Vulnerabilities in the upstream toolchain itself should be reported to
[salesforce/agentscript](https://github.com/salesforce/agentscript).
