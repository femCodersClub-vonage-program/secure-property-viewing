# Security policy

Peephole handles phone numbers and Vonage credentials, so we take security reports seriously even though this is a portfolio project.

## Reporting a vulnerability

Please do not report vulnerabilities through public issues, pull requests or Slack.

Report them privately through GitHub instead: go to the **Security** tab of this repository and select **Report a vulnerability**. Only the maintainers can see the report.

A useful report includes:

- What the vulnerability is and where it is (file, endpoint or screen)  
- How to reproduce it  
- What an attacker could achieve with it

Please do not include real personal data in the report. If you need an example, use a Vonage test number.

## What happens next

We will acknowledge your report, keep you informed while we work on it, and let you know when it is fixed. If we decide it is not a vulnerability, we will explain why.

## Credentials

Credentials are never written in the code. They live only in `.env`, which is listed in `.gitignore` together with the Vonage CLI configuration (`.vonagerc`) and private keys, and `.env.example` only lists the variable names.

If a Vonage API key, secret or private key still ends up in the repository, its history or a pull request, report it the same way. We will revoke it in the Vonage dashboard first and then remove it from the repository, because removing it from the code alone does not make it safe.

## Scope

This policy covers the code and configuration in this repository. If you believe an issue comes from the Vonage platform itself, report it here first: we will audit and debug it to rule out a cause in our own code, and only then report it to Vonage.
