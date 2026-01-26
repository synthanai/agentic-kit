# Contributing to agentic-kit

Thank you for your interest in contributing to agentic-kit!

## Code of Conduct

Be respectful. We're building tools for decision-making — let's model good decisions ourselves.

## How to Contribute

### Reporting Issues

1. Check existing issues first
2. Use the issue template
3. Include reproduction steps

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`pytest tests/`)
6. Submit a pull request

### Contributor License Agreement (CLA)

By submitting a pull request, you agree to the following:

1. You have the right to submit the code under the MIT license
2. You grant SYNTHAI TECH PTY LTD a perpetual, worldwide, non-exclusive, royalty-free license to use, modify, and distribute your contribution
3. Your contribution may be relicensed under compatible open-source licenses in the future

This CLA is designed to protect both contributors and the project's ability to evolve.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/synthanai/agentic-kit.git
cd agentic-kit

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest tests/ -v
```

## Code Style

- Use `black` for formatting
- Use `ruff` for linting
- Type hints are encouraged
- Docstrings for all public functions

## Questions?

Open a discussion on GitHub or reach out to the maintainers.
