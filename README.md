# Drummer

Drummer is a modern, lightweight, browser-first drum machine and practice tool. The project is TypeScript-first and focuses on low-latency audio, an intuitive step-sequencer, and an extensible architecture suitable for sketching beats, practicing with a metronome, and loop-based composition.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Key Features

- Grid/sequencer-based editor with a visual playhead
- Precise tempo (BPM), swing and bar-length controls
- Multiple drum channels (kick, snare, hi-hat, toms, percussion)
- Local save and load of patterns (LocalStorage / IndexedDB)
- Extensible sample management and custom kit support
- Responsive, keyboard-accessible and accessibility-minded interactions
- Low-latency scheduling suitable for practice and live performance

## Tech Stack

- TypeScript - core logic and components
- React 18 - UI framework
- Vite - build tool
- Vitest + React Testing Library - testing framework
- Web Audio API - audio engine
- Vite PWA - PWA support

## Quick Start

### Prerequisites

- Node.js 18+ (or use [bun](https://bun.sh))
- bun, npm, yarn, or pnpm

### Local Development

```bash
git clone https://github.com/xtongs/drummer.git
cd drummer

# using bun (recommended)
bun install
bun run dev

# using npm
npm install
npm run dev
```

## Development Workflow

This project follows **TDD (Test-Driven Development)** and **SDD (Spec-Driven Development)** methodologies. See [`.claude/CLAUDE.md`](.claude/CLAUDE.md) for detailed development guidelines.

### TDD Process (Red-Green-Refactor)

1. **Red**: Write failing tests first
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Refactor code with test coverage

### SDD Process

Follow the spec-driven development workflow:

```
proposal → design → tasks → implement → verify → archive
```

See [openspec/AGENTS.md](openspec/AGENTS.md) for complete guidelines.

### Development Steps

- Create feature branches: `feat/`, `fix/`, `refactor/`
- **Write tests first** before implementing features
- Run checks before committing:
```bash
bun run lint
bun run typecheck
bun run test
```

## Testing

```bash
# Run all tests
bun run test

# Run tests once
bun run test:run

# Run tests in watch mode
bun run test:watch

# Run tests with coverage report
bun run test:coverage
```

### Coverage Requirements

- Core business logic (hooks, utils): >= 80%
- UI components may have lower requirements

## Build & Deployment

```bash
# Production build
bun run build

# Preview production build
bun run preview
```

The build output is static and can be deployed to any static hosting platform (Vercel, Netlify, GitHub Pages, etc.).

## Project Structure

```
src/
├── components/       # UI components
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── styles/          # Global styles
└── test/            # Test setup

openspec/
├── project.md       # Project context
├── AGENTS.md        # AI assistant guidelines
├── specs/           # Feature specifications
└── changes/         # Change proposals
```

## Contributing

Contributions are welcome. Follow these steps:

1. Check existing issues and specifications in `openspec/specs/`
2. For new features or major changes, create a proposal in `openspec/changes/`
3. Create a branch: `git checkout -b feat/your-feature`
4. Follow TDD and SDD processes
5. Ensure all tests pass and coverage requirements are met
6. Open a pull request with clear description

## License

This project is licensed under the MIT License.
