# Drummer

Drummer is a modern, lightweight, browser-first drum machine and practice tool. The project is TypeScript-first and focuses on low-latency audio, an intuitive step-sequencer, and an extensible architecture suitable for sketching beats, practicing with a metronome, and loop-based composition.

---

Table of contents
- Introduction
- Key features
- Tech stack
- Quick start
- Development workflow
- Build & deployment
- Project structure
- Contributing
- PR checklist
- Roadmap
- License & acknowledgements
- Contact

---

Introduction
Drummer provides stable and predictable beat scheduling, persistent pattern management, multi-channel drum tracks, and a responsive UI. The design goals are low-latency playback, tight timing accuracy, and a developer-friendly TypeScript codebase.

Key features
- Grid/sequencer-based editor with a visual playhead
- Precise tempo (BPM), swing and bar-length controls
- Multiple drum channels (kick, snare, hi-hat, toms, percussion)
- Local save and load of patterns (LocalStorage / IndexedDB)
- Extensible sample management and custom kit support
- Responsive, keyboard-accessible and accessibility-minded interactions
- Low-latency scheduling suitable for practice and live performance

Tech stack
This repository is a frontend web application with the following composition:
- TypeScript: core logic and components (~83%)
- CSS: styling and responsive layout (~13%)
- HTML: entry page and templates (~2%)
- Other assets (audio samples, images, config) (~1%

Quick start

Prerequisites
- Node.js (LTS recommended, e.g., Node 16 or newer)
- npm, yarn, or pnpm

Local development
```bash
git clone https://github.com/xtongs/drummer.git
cd drummer

# using npm
npm install
npm run dev

# using yarn
yarn
yarn dev

# using pnpm
pnpm install
pnpm dev
```

Development workflow

This project follows **TDD (Test-Driven Development)** methodology. See `CLAUDE.md` for detailed development guidelines.

### TDD 流程 (Red-Green-Refactor)

1. **Red**: 先编写测试用例，确保测试失败
2. **Green**: 编写最少量代码使测试通过
3. **Refactor**: 在测试保护下重构代码

### 开发步骤

- Develop using TypeScript with clear types and modular design.
- Create feature branches using conventional prefixes: `feat/`, `fix/`, `chore/`.
- **Write tests first** before implementing new features
- Run static checks and tests before committing:
```bash
bun run lint
bun run test
```
- Include screenshots or short recordings for UI changes and ensure new logic is covered by tests where appropriate.

Testing

```bash
# Run tests in watch mode (recommended during development)
bun run test

# Run tests once
bun run test:run

# Run tests with coverage report
bun run test:coverage

# Run tests in watch mode
bun run test:watch
```

Build & deployment
- Production build:
```bash
bun run build
```
- The build output is static and can be deployed to any static hosting platform (Vercel, Netlify, GitHub Pages, etc.).
- Typical deployment flow: generate the production build and upload the output directory to the hosting platform or publish via CI/CD.

Project structure (example)
A recommended high-level layout:
```
/src
  /components       # UI components: sequencer, controls, panels
  /audio            # WebAudio abstractions: scheduler, sampler, transport
  /state            # Global state and mode management
  /lib              # Utility functions and helpers
  /styles           # Global styles and variables
  main.tsx / index.ts
/public
  /samples          # Default drum samples
  index.html
tests/
docs/
package.json
tsconfig.json
```

Contributing
Contributions are welcome. Follow these steps:
1. Open an issue to discuss major changes when appropriate.
2. Create a branch from main: `git checkout -b feat/your-feature`.
3. Make changes with clear commits and ensure linting and tests pass.
4. Open a pull request with a clear description, screenshots for UI changes, and test notes.

PR checklist
- Tests added or updated for relevant functionality
- Code style follows repository conventions (Prettier / ESLint)
- Documentation updated for any interface or behavioral changes
- Screenshots or recordings provided for UI changes

Roadmap
Planned improvements and priorities:
- Enhanced sample pack management and import/export workflows
- Pattern chaining and song-mode sequencing
- Expanded MIDI support and mapping tools
- Export full songs as WAV
- Mobile interaction and touch experience improvements

License & acknowledgements
This project is licensed under the MIT License. Third-party samples and assets must be listed in an ACKNOWLEDGEMENTS file or within docs with proper attribution and licensing details.

Contact
Maintainer: xtongs  
Use GitHub issues and pull requests for discussions and contributions. Important decisions and design discussions are tracked in issues and PRs.

--- 

This README is structured for direct use as the repository top-level README. Replace example project-structure entries and command names only if they differ from the repository's actual configuration.