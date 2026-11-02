# Specs

Every feature in Peephole starts with a spec: what we are building, why, and how we will know it works. Writing it first gives the whole team the same picture before anyone writes code, and gives the AI assistants a clear brief to work from.

## Lifecycle

1. **Draft.** Someone opens the spec issue and writes the spec on a branch, starting from [`template.md`](template.md)
2. **Review.** The spec goes into a pull request to `dev`. The tech lead and the people who will build on it comment there: questions, gaps and suggestions are all welcome
3. **Approved.** Once the review is done, the author changes the status to `Approved` in the last commit, and merging the pull request makes it official
4. **Build.** Feature issues link to the approved spec, and their acceptance criteria come from it

A spec can change after it is approved. If a feature needs something the spec does not cover, such as a new table or endpoint, we update the spec in the same pull request and say so in the description.

## Naming

One file per feature, named in English and in kebab-case, such as `phone-verification.md`.

## Specs

| Spec | Covers |
| :---- | :---- |
| [Data model and API contract](data-model-and-api-contract.md) | The entities, the endpoints every screen uses, the error format and the sample data |
| [Phone verification](phone-verification.md) | Phone verification with a one-time code by SMS, for visitors and owners |
| [Property browsing](property-browsing.md) | Home page, property catalog and property details (journey A, steps 1 to 3) |
| [Agency dashboard](agency-dashboard.md) | The five screens of the agency dashboard |
