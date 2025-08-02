# AGENTS.md - Guidelines for Toneparse Codebase

## Build/Test Commands
- Run project: `bun run index.ts FILE.[xml|patch|cst]`
- Watch mode: `bun run dev`
- Run all tests: `bun test`
- Run single test: `bun test tests/neural_dsp_parser.test.ts`
- Run specific test: `bun test --test-name-pattern="Accuracy - legacy format"`

## Code Style Guidelines
- **Formatting**: Use Prettier with tabWidth: 4, semi: false, singleQuote: false
- **Imports**: Order - built-ins first, then local modules
- **Types**: Use TypeScript types for all functions and classes
- **Naming**: 
  - Variables/functions: snake_case
  - Classes: PascalCase
  - Constants: ALL_CAPS
- **Error Handling**: Use try/catch with descriptive error messages
- **Logging**: Use lib/logging.ts utilities for consistent output formats
- **Parser Pattern**: Extend BaseParser for all parser implementations

## Project Structure
- `/lib`: Core parsing logic and utilities
- `/tests`: Test files with `/tests/assets` containing test files
- `/types`: TypeScript type definitions
