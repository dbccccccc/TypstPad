# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.2] - 2026-01-07

### Changed
- **Monaco Editor Localization** - Switched from CDN to local file loading

### Improved
- **Shiki Syntax Highlighting Optimization** - Implemented fine-grained imports

## [0.6.1] - 2026-01-06

### Fixed
- **PNG/JPG Export** - Fixed "tainted canvas" SecurityError that prevented image export
  - Switched from blob URLs to data URLs to avoid CORS/COEP conflicts
  - Resolves compatibility issues with Cross-Origin-Embedder-Policy headers

## [0.6.0] - 2026-01-05

### Added
- **Layout Mode Setting** - Choose between vertical and side-by-side layouts
  - Options: "Vertical" (default) or "Side by Side"
  - Side-by-side mode displays input on the left and output on the right with 50/50 split
  - Independent scrolling for each panel in side-by-side mode
  - Responsive design: automatically switches to vertical layout on screens smaller than 1024px
  - Accessible in Settings dialog under "Editor Settings" section

## [0.5.0] - 2026-01-04

### Added
- **Typst Auto Complete** - Intelligent symbol and function suggestions while typing
  - Suggests Typst symbols (Greek letters, operators, arrows, etc.)
  - Suggests Typst functions (frac, sqrt, sum, integral, etc.)
  - Shows symbol preview and category in suggestions
- **Auto Complete Setting** - Toggle to enable/disable auto complete (enabled by default)

## [0.4.1] - 2026-01-04

### Added
- **Startup Behavior** setting - Choose whether to start with a blank editor or resume from last edit
  - Options: "Last Edit" (default) or "Blank"
  - Accessible in Settings dialog under "Editor Settings" section

## [0.4.0] - 2026-01-04

### Added
- **Formula Library** - Save and manage your formulas locally in the browser
  - Save button in Input section header for quick formula saving
  - Saved Formulas dialog accessible from header (Bookmark icon)
  - Load, rename, and delete saved formulas
  - Clear All button to remove all saved formulas at once
- **Auto-save Draft** - Automatically saves your current work to localStorage
  - Restores last edited content when reopening the app
  - No more losing work when accidentally closing the browser

### Changed
- Removed default example formulas - new users now start with a blank editor
- Improved user experience for first-time users

## [0.3.0] - 2025-12-30

### Added
- **Simplified Formula Mode** setting: Automatically wraps content in `$ ... $` for math mode
  - Enabled by default for easier formula input
  - Users can disable it to manually control math mode delimiters
  - Accessible in Settings dialog under "Formula Mode" section

### Changed
- Improved default demo formulas to display on separate lines with proper Typst line breaks
- Enhanced formula rendering consistency across different input modes

## [0.2.0] - 2025-12-30

### Added
- Math toolbar

## [0.1.6] - 2025-12-29

### Fixed
- Restored working linting with ESLint v9 flat config
- Removed deprecated `escape`/`unescape` usage in share/export utilities
- Debounced preview compilation and prevented stale updates

### Changed
- Documented Node.js 18+ requirement and enforced via `package.json` engines

## [0.1.5] - 2025-12-27

### Fixed
- Nginx startup command deleted to fix startup error

## [0.1.4] - 2025-12-27

### Added
- Brotli compression support for improved asset delivery
- Service worker caching for WASM and font files
- Enhanced offline performance and reduced load times

### Changed
- Switched production Docker image to Nginx with Brotli support
- Updated nginx.conf to enable Brotli compression
- Enhanced README with image and license badges

## [0.1.3] - 2025-12-26

### Added
- Application icon/favicon

## [0.1.2] - 2025-12-26

### Added
- Automated version display from package.json

## [0.1.1] - 2025-12-26

### Added
- Self-hosted fonts to reduce external CDN dependency
- WASM streaming compilation for faster loading
- Loading progress display for compiler, renderer, and fonts
- WASM preload tags via Vite plugin

### Changed
- Updated nginx config for font caching (.otf support)
- Added font download script for easy font updates
- Updated Docker build configuration

## [0.1.0] - 2025-12-26

### Added
- Initial release of TypstPad
- Real-time Typst formula preview with Monaco editor
- Multiple export formats (PNG, JPG, SVG, HTML, Typst)
- Clipboard support for images and code
- Share functionality with URL encoding
- Theme support (Light, Dark, System)
- Customizable settings:
  - Adjustable font size (12-24px)
  - Toggle line numbers
  - PNG export scale (1x-4x)
  - Dark mode preview background options
- Syntax highlighting for Typst code using Shiki
- Error display with helpful hints and documentation links
- Professional UI built with Radix UI components
- Responsive layout with Tailwind CSS

### Technical
- Built with React 18 and TypeScript
- Vite as build tool
- Monaco Editor for code editing
- @myriaddreamin/typst.ts for Typst compilation
- Full TypeScript support with strict type checking
