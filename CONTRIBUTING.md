# Contributing to GNOME Routines

First off, thanks for taking the time to contribute!

The following is a set of guidelines for contributing to GNOME Routines. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Found a bug? We'd love to hear about it!

- **Title**: Clearly state the problem.
- **Description**: Tell us what happened and how we can see it too.
- **Screenshots**: extremely helpful if something looks wrong.
- **Logs (Optional)**: If you know how to get logs, they are great. If not, don't worry!

### Suggesting Enhancements

Have an idea?

- **Title**: What is your idea?
- **Description**: Explain what you want to see and why it would be useful.

### Pull Requests

1.  Fork the repo and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  If you've changed APIs, update the documentation.
4.  Ensure the test suite passes (`npm test`).
5.  Make sure your code lints (`npm run lint`).
6.  Issue that pull request!

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Styleguide

- Use **TypeScript** for all new code.
- No global variables (explicitly import `debugLog`).
- Prefer `const` over `let`.
- Use `async`/`await` for asynchronous operations.
- run `npx tsc --noEmit` to verify types before committing.

## Development Setup

See the [README.md](README.md#development) for installation and build instructions.
