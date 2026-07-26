# Contributing to Evanston Pickup Games

## Getting Started

1. Clone the repository
2. Follow the Quick Start in README.md
3. Create a new branch for your feature

## Development Workflow

### Branch Naming
- Features: `feature/descriptive-name`
- Bugfixes: `fix/descriptive-name`
- Documentation: `docs/descriptive-name`

### Commits
- Use clear, descriptive commit messages
- Reference issues when relevant: `fixes #123`
- Keep commits atomic and focused

### Pull Requests
- Fill out the PR template completely
- Reference related issues
- Ensure all tests pass
- Request review from maintainers

## Code Style

- Use ESLint configuration (run `npm run lint`)
- Use Prettier for formatting (run `npm run format`)
- Follow TypeScript strict mode
- Write tests for new features

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Documentation

- Update README.md for user-facing changes
- Update docs/ for architectural/technical changes
- Include code comments for complex logic
- Document new environment variables

## Questions?

Open an issue or contact the maintainers.
