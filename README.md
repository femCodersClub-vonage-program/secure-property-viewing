# Peephole · Secure Property Viewing

🇪🇸 [Leer en español](README.es.md)

A web platform for remote property visits with anti-fraud verification, built with Vonage APIs as part of the **FemCoders Club with Vonage** projects and mentoring program.

> Status: initial draft. The Vonage APIs have been chosen, and the tech stack will be agreed as a team.

## Table of contents

1. [About the project](#about-the-project)  
2. [MVP scope](#mvp-scope)  
3. [What it solves and how we integrate Vonage](#what-it-solves-and-how-we-integrate-vonage)  
4. [Tech stack](#tech-stack)  
5. [How we work](#how-we-work)  
6. [Documentation](#documentation)  
7. [Team](#team)  
8. [Security and personal data](#security-and-personal-data)  
9. [Code of conduct](#code-of-conduct)  
10. [License](#license)

## About the project

Looking for a rental apartment has become fertile ground for scams: listings with stolen photos, impersonated agencies, deposits paid upfront for homes that do not exist, and visits where the person showing the apartment has no connection to it.

Peephole starts from a simple idea: **nobody should pay money upfront without first confirming that the apartment exists and that the person advertising it is who they claim to be**. To achieve this, the platform verifies the phone number of every party, enables live video visits of the property and keeps all communication within its own channel.

The scenario is a real estate agency in Catalonia that publishes properties, reviews requests from property owners and handles visits.

## MVP scope

The program lasts six weeks, so the MVP focuses on what gives the project its purpose: confirming that the apartment exists and that every party is who they claim to be.

**In the MVP**

- The three [user journeys](docs/user-journeys.md): visitor, owner and agency dashboard  
- Catalog of properties for sale and for rent, loaded from seed data  
- Phone verification via SMS OTP  
- One-to-one guided video visit, and a video call between the owner and the agency  
- Multi-party visit, so a second interested person or the owner can join  
- Confirmations, reminders and notifications by SMS  
- Request management and visit calendar in the agency dashboard

**Planned for later**

- Silent Authentication  
- WhatsApp Business notifications  
- Signing or ratification by video with the property manager, and two-step verification of all parties  
- Recording of video sessions  
- In-platform payments  
- Integration with real property portals

## What it solves and how we integrate Vonage

| Fraud vector | Risk | Vonage module that mitigates it |
| :---- | :---- | :---- |
| **Ghost listing or fake identity**: advertiser using a disposable number or a bot | Unverified advertiser: there is no way to know whether the person is real or using a temporary number | **Verify API**: SMS OTP to verify the advertiser's phone number, with Silent Authentication as a later step |
| **Non-existent apartment or stolen photos**: the property does not match the listing | Misrepresented property: the photos are fake or belong to another property | **Video API**: live interactive visit to confirm that the property exists and matches the listing |
| **Phishing or diversion to external channels**: malicious links or payments through opaque channels | Fraudulent links and payments outside official channels | **Messages API**: notifications always sent from the platform's official channel, so communication is secure and traceable |
| **Multiple sales or fake deposits** *(later)*: lack of traceability and double bookings | The same property is booked or sold to several people, with upfront payments and no guarantees | **Video API + Verify API**: signing or ratification with the property manager by video, and two-step verification of all parties before any payment order |

How we use each API, and the Vonage SDKs, CLI and MCP servers that support development, are described in [`docs/vonage.md`](docs/vonage.md).

## Tech stack

To be agreed as a team. The only settled part is the communications layer with Vonage, and the specific Server SDK version will depend on the language we choose for `server/`.

The decision will be recorded in the first ADR. The high-level [architecture](docs/architecture/README.md) is already defined and independent of the stack.

## How we work

We follow Spec-Driven Development, record technical decisions as ADRs, track tasks in a GitHub Project and integrate every change through reviewed pull requests against `dev`. AI is part of our daily work, with its own configuration and rules versioned in the repository.

The full workflow, the repository structure, the testing strategy, how we use AI and the Definition of Done are in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Documentation

| Document | Content |
| :---- | :---- |
| [`docs/setup.md`](docs/setup.md) | How to run the project on your own computer, step by step |
| [`docs/user-journeys.md`](docs/user-journeys.md) | The visitor, owner and agency dashboard journeys, step by step |
| [`docs/vonage.md`](docs/vonage.md) | Vonage APIs and developer tools |
| [`docs/architecture/`](docs/architecture/README.md) | Architecture diagrams, main flow and design principles |
| [`docs/adr/`](docs/adr/) | The project's architecture decisions |
| [`docs/guides/`](docs/guides/README.md) | Short guides on problems the whole team runs into |
| [`docs/presentations/`](docs/presentations/) | Project presentations, such as the one from the mentoring session [*Is this a real rental listing or a scam?*](docs/presentations/real-listing-or-scam.pdf) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Workflow, conventions, testing, AI usage and repository structure |

## Team

<table>
<tr>
<td align="center" width="120">
<a href="https://github.com/Irina-Ichim"><img src="https://github.com/Irina-Ichim.png" width="96" alt="Irina Ichim" /></a>
</td>
<td>
<strong>Irina Ichim</strong><br />
Tech lead and mentor<br />
<a href="https://www.linkedin.com/in/irina-ichim-desarrolladora/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="Irina Ichim on LinkedIn" /></a>
<a href="https://github.com/Irina-Ichim"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="Irina Ichim on GitHub" /></a>
</td>
<td align="center" width="120">
<a href="https://github.com/Nelicah"><img src="https://github.com/Nelicah.png" width="96" alt="Cande Zamora" /></a>
</td>
<td>
<strong>Cande Zamora</strong><br />
Participant<br />
<a href="https://www.linkedin.com/in/cande-zamora-125301349/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="Cande Zamora on LinkedIn" /></a>
<a href="https://github.com/Nelicah"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="Cande Zamora on GitHub" /></a>
</td>
<td align="center" width="120">
<a href="https://github.com/may-leth"><img src="https://github.com/may-leth.png" width="96" alt="Mayleth Carrascal" /></a>
</td>
<td>
<strong>Mayleth Carrascal</strong><br />
Participant<br />
<a href="https://www.linkedin.com/in/maylethcarrascal/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="Mayleth Carrascal on LinkedIn" /></a>
<a href="https://github.com/may-leth"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="Mayleth Carrascal on GitHub" /></a>
</td>
</tr>
<tr>
<td align="center" width="120">
<a href="https://github.com/Kat-lev"><img src="https://github.com/Kat-lev.png" width="96" alt="Kat Leverton" /></a>
</td>
<td>
<strong>Kat Leverton</strong><br />
Participant<br />
<a href="https://www.linkedin.com/in/kat-leverton/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="Kat Leverton on LinkedIn" /></a>
<a href="https://github.com/Kat-lev"><img src="https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white" alt="Kat Leverton on GitHub" /></a>
</td>
<td align="center" width="120">
<img src="https://github.com/ghost.png" width="96" alt="" />
</td>
<td>
<strong><em>To be confirmed</em></strong><br />
Participant
</td>
<td align="center" width="120">
<img src="https://github.com/ghost.png" width="96" alt="" />
</td>
<td>
<strong><em>To be confirmed</em></strong><br />
Participant
</td>
</tr>
</table>

A project developed within the **FemCoders Club** program with the support of **Vonage**, which provides the API credits, a technical workshop and guidance from its team.

## Security and personal data

The application handles phone numbers, so even though it is a portfolio project we treat it with the same care as a real one:

- During development only **test data** is used: the team's own phone numbers with their consent, or Vonage test numbers  
- Credentials are never committed to the repository: `.env` is in `.gitignore`, and `.env.example` only lists the variable names, with placeholder values and no hints such as hosts, users or database names  
- Sensitive files are excluded from the reach of AI assistants in `.claude/settings.json`  
- If you find a vulnerability, the way to report it is described in [`SECURITY.md`](SECURITY.md)

## Code of conduct

This project follows the [FemCoders Club code of conduct](https://www.femcodersclub.com/codigo-de-conducta) (in Spanish), which sets out the community's rules of conduct at events, on Slack, on social media and in programs, including group projects.

## License

This project is distributed under the [MIT](LICENSE) license.
