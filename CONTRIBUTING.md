# Contributing guide

🇪🇸 [Leer en español](CONTRIBUTING.es.md)

Thank you for being part of Peephole. This guide describes how we work as a team, from writing a spec to getting code into `main`, so that anyone who joins can follow the workflow without relying on verbal explanations.

Some of these practices are industry standard, and others we keep for their learning value, even though a small team could simplify them. Where that is the case, we say so.

## Table of contents

1. [From problem to code](#from-problem-to-code)  
2. [Repository structure](#repository-structure)  
3. [Tasks in the GitHub Project](#tasks-in-the-github-project)  
4. [Branches](#branches)  
5. [Before opening a pull request](#before-opening-a-pull-request)  
6. [Pull requests and review](#pull-requests-and-review)  
7. [Continuous integration](#continuous-integration)  
8. [Testing](#testing)  
9. [AI in the project: agents, skills and tools](#ai-in-the-project-agents-skills-and-tools)  
10. [Conventions](#conventions)  
11. [Changelog](#changelog)  
12. [Definition of Done](#definition-of-done)  
13. [Follow-up and questions](#follow-up-and-questions)

## From problem to code

We work with **Spec-Driven Development (SDD)**, so no feature starts with code:

1. **Spec**: what is being built, why, and with which acceptance criteria. It is stored in `specs/`  
2. **Review**: the tech lead and the team validate the spec before moving on  
3. **Technical plan**: how it will be implemented  
4. **Tasks**: the plan is broken down into issues in the GitHub Project  
5. **Implementation**: every pull request links its issue and the spec it comes from

If a relevant architectural decision comes up along the way, it is recorded as an ADR in `docs/adr/`, with its context, the decision, the discarded alternatives and its consequences. ADRs are numbered in order (`0001-tech-stack.md`) and start from [`docs/adr/template.md`](docs/adr/template.md).

## Repository structure

```text
secure-property-viewing/
├── .claude/
│   ├── agents/                  # Project agents
│   ├── skills/                  # Team skills
│   └── settings.json            # Permissions and files excluded from AI
├── .github/
│   ├── ISSUE_TEMPLATE/          # Issue templates
│   ├── workflows/               # Continuous integration with GitHub Actions
│   ├── CODEOWNERS               # Automatically assigned review
│   └── PULL_REQUEST_TEMPLATE.md # Pull request template
├── client/
│   └── AGENTS.md                # Client-specific instructions
├── server/
│   └── AGENTS.md                # Server-specific instructions
├── e2e/                         # End-to-end tests of the user journeys
├── specs/                       # Specification for each feature
├── docs/
│   ├── adr/                     # Architecture decisions
│   ├── architecture/            # Architecture overview and Mermaid diagrams
│   ├── guides/                  # Guides on problems the whole team runs into
│   ├── images/                  # Images used in the documentation
│   ├── presentations/           # Project presentations
│   ├── user-journeys.md         # User journeys, step by step
│   └── vonage.md                # Vonage APIs and developer tools
├── .editorconfig                # Shared formatting across editors
├── .env.example                 # Environment variables template, with no real values
├── .gitignore
├── AGENTS.md                    # General project instructions
├── CHANGELOG.md                 # Change log, generated automatically
├── CONTRIBUTING.md              # Workflow and conventions
├── CONTRIBUTING.es.md           # Spanish version
├── LICENSE
├── README.md                    # English version
├── README.es.md                 # Spanish version
└── SECURITY.md                  # How to report a vulnerability
```

## Tasks in the GitHub Project

The GitHub Project is the single source of tasks. Every issue has an assignee and links to its spec.

- **Labels** by type (`enhancement`, `bug`, `documentation`, `spec`, `adr`, `accessibility`) and by group (`client`, `server`, `devops`, `qa`, `e2e`). Before creating a new label, check whether an existing one already fits  
- **Milestones** by program week, to see at a glance what goes into each one

Issues are opened using the templates in `.github/ISSUE_TEMPLATE/`. The title starts with the group and a sequential number within that group, beginning at 01: `server-01: Add OTP verification endpoint`. The groups are `client`, `server`, `devops`, `qa` and `docs`, and each issue also carries the matching label (`documentation` for the `docs` group).

## Branches

main  ◄──  dev  ◄──  each participant's branches

- **`main`**: stable version. It only receives changes from `dev` when a milestone is closed  
- **`dev`**: the team's integration branch and the repository's default branch  
- **Working branches**: each participant creates their own from `dev`, named in English, such as `feature/otp-verification` or `fix/visit-reminder`

`main` and `dev` are protected: direct pushes are not allowed, and changes are only accepted through pull requests, with the tech lead's review and continuous integration passing.

> Many companies use trunk-based development, with short-lived branches merged directly into `main`. We keep `dev` as an intermediate branch because, in a team that is still learning, it gives room to integrate and test before touching the stable version.

## Before opening a pull request

1. Update your branch with the latest changes from `dev`  
2. Run the tests locally  
3. Run the **review agents** on your changes and address their findings  
4. Make sure you understand and can explain every line, including any generated by AI

>   
> In many companies, AI review is handled by a bot in CI. Here we also ask you to run it locally, because it is the best way to learn how to read and act on its findings, and CI works as a safety net.

## Pull requests and review

- All pull requests target `dev`  
- The description follows the repository template: what changes, why, what is intentionally left out, and how to test it  
- The pull request links its issue with `Closes #n`, so the issue closes when it is merged  
- `CODEOWNERS` automatically assigns the review to the tech lead  
- If there is a debatable decision, it is explained in the description before someone finds it in the diff  
- Reviews always distinguish blocking issues from suggestions  
- Once the tech lead approves it, **the author merges the pull request into `dev`** with *Squash and merge*. The pull request title becomes the commit message. If new commits are pushed after the approval, the approval is dismissed and a new review is needed  
- Only the tech lead merges `dev` into `main`, with a regular merge, when each milestone is closed

## Continuous integration

Every pull request runs linting, formatting and tests in GitHub Actions. If feasible, it will also run the review agents, so that step does not rely solely on each person running it locally.

## Testing

Every feature is delivered with its tests, and the acceptance criteria in the spec are the starting point for writing them.

| Level | What it covers |
| :---- | :---- |
| **Unit** | Isolated business logic in `client/` and in `server/` |
| **Integration** | Server endpoints and their interaction with the database and with Vonage, using test doubles instead of real calls |
| **End-to-end** | The complete user journeys, from the point of view of the person using the application |

We are considering working with **TDD** on the business logic. The testing tools will be decided together with the stack.

## AI in the project: agents, skills and tools

AI is part of our daily work, so we treat it as one more tool, with its own configuration versioned in the repository and its own rules.

| Element | What it is for | Where |
| :---- | :---- | :---- |
| **Instructions** | Project context and conventions, general and per folder | `AGENTS.md` at the root, in `client/` and in `server/` |
| **Agents** | Specialized assistants, for example for code review, security or test coverage | `.claude/agents/` |
| **Skills** | Reusable team procedures, such as writing a spec or an ADR | `.claude/skills/` |
| **Tools** | External connections the agents can use, starting with the Vonage MCP servers | Project MCP configuration |

Throughout the mentoring sessions we will explore how to make the most of AI, and these are our starting principles:

- **The spec comes first.** An assistant performs much better on a clear specification than when asked to improvise  
- **AI-generated code is reviewed like any other code.** Whoever opens the pull request is responsible for understanding and being able to explain every line  
- **Anything an assistant says about Vonage is checked against the official documentation.** Its knowledge of an API can be out of date, so we query the Documentation MCP Server instead of relying on its memory  
- **Credentials, keys and personal data are never pasted** into an assistant  
- **AI is for learning, not for skipping the learning.** The goal is for every participant to be able to defend the project in a job interview

## Conventions

- `.editorconfig` so every editor shares indentation, line endings and encoding  
- A shared linter and formatter, to be defined together with the stack  
- Commits following [Conventional Commits](https://www.conventionalcommits.org/), for example `feat(server): add OTP verification endpoint`  
- Code, identifiers, branch names and documentation in American English. The README and this guide also have a Spanish version, so any change to one language goes to the other in the same pull request  
- **Visit** is the domain term for a video visit to a property: `Visit` in the code, *visit* in the interface and the documentation. We do not use *viewing*, *showing* or *tour*, so the same concept never has two names

## Changelog

The tech lead generates `CHANGELOG.md` with AI from the commit history when each milestone is closed, so nobody edits it by hand. Since squash turns each pull request title into a commit, the title must follow Conventional Commits and describe the change clearly.

## Definition of Done

An issue is considered done when it meets all of the following:

- [ ] It meets the acceptance criteria of its spec  
- [ ] It has tests, and they pass locally and in CI  
- [ ] It has gone through the review agents, and their findings have been addressed  
- [ ] It has been approved by the tech lead in the pull request  
- [ ] Affected documentation is up to date, including an ADR if an architectural decision was made

## Follow-up and questions

We hold a weekly online mentoring session between the tech lead and the team, and use Slack for day-to-day questions. No question is out of place: if something in this guide is unclear, it is the guide that needs improving.
