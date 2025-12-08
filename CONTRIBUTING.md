# Contributing to GNOME Routines

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to GNOME Routines. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the steps to reproduce the problem** in as much detail as possible.
- **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
- **Explain which behavior you expected to see instead and why.**
- **Include screenshots** if the problem is related to the UI.
- **include logs** from `journalctl -f -o cat /usr/bin/gnome-shell` if relevant.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as much detail as possible.
- **Explain why this enhancement would be useful** to most GNOME Routines users.

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
