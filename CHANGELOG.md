# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.7] - 2025-12-30

### Fixed
- Fixed tooltip display issues in math toolbar where tooltips were clipped or hidden
- Added Portal rendering to prevent tooltips from being clipped by parent containers
- Increased tooltip z-index to prevent overlay by dropdown menus
- Added collision detection for automatic tooltip position adjustment

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
