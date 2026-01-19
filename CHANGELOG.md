# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.8.2] - 2026-01-20

### Changed
- **Formula Library UI** - Move saved formulas action next to Save and label it as Load

## [0.8.1] - 2026-01-19

### Changed
- **Font Manager** - Group uploaded variants by family and ignore duplicate uploads

## [0.8.0] - 2026-01-19

### Added
- **Font Manager** - Install/remove bundled fonts and upload local .otf/.ttf fonts stored in the browser
- **Font Manager Shortcut** - Added a Fonts button beside Save in the input header for quick access

### Changed
- **Default Font Set** - Reduced bundled defaults to a minimal serif + math set for faster loading
- **Font Loading Pipeline** - Load only selected bundled fonts and uploaded fonts

### Fixed
- **Font Refresh Loading** - Prevent loading progress from sticking after installing new fonts

## [0.7.0] - 2026-01-18

### Added
- **Internationalization** - English and Simplified Chinese UI translations with locale detection and persistence
- **Language Switcher** - Header language menu with system locale suffix when supported

### Changed
- **Header Actions Spacing** - Tighter spacing between header buttons
- **Math Toolbar Layout** - Allow wrapping to avoid horizontal scrollbar on narrow widths

## [0.6.8] - 2026-01-16

### Added
- **Floating Menu Component** - Shared dropdown menu logic with hover/click support, outside-click dismissal, and collision-aware positioning

### Changed
- **Header Layout** - Keep title and actions on one line; move theme switcher into a dropdown menu
- **Mobile Spacing** - Reduced paddings and panel heights on small screens for better fit
- **Export Actions Layout** - Right-align export/share buttons across breakpoints and hide text labels on small screens
- **Symbol Picker Layout** - Adjust grid columns on small screens and constrain menu height with scrolling
- **Settings Dialog Layout** - Stack controls and use full-width selects/sliders on small screens
- **Dialog Sizing** - Add max-height scrolling and smaller padding for better mobile usability
- **Formula Card Actions** - Show action buttons on small screens without hover
- **Viewport Height Handling** - Use dynamic viewport height to better handle mobile browser chrome

## [0.6.7] - 2026-01-16

### Changed
- **Typst Loading Progress** - Support multiple subscribers and fail fast on missing WASM assets
- **Export Pipeline** - Reuse shared SVG-to-PNG conversion for downloads
- **Settings Startup** - Avoid double-reading local settings on load
- **HTML Export Helpers** - Centralized HTML snippet generation for copy/download

### Fixed
- **Formula Storage Validation** - Sanitize and migrate invalid localStorage payloads
- **Clipboard PNG Copy** - Guard against unsupported clipboard image APIs

### Removed
- **Unused Tabs UI** - Dropped unused tabs component

## [0.6.6] - 2026-01-16

### Removed
- **Automatic Version Detection** - Removed update checks and update notification UI

## [0.6.5] - 2026-01-14

### Changed
- **Package Updates** - Updated dependencies to latest versions

## [0.6.4] - 2026-01-09

### Added
- **Automatic Version Detection** - Detects when a new version is deployed and prompts users to update
  - Checks for updates on app startup (after 5 seconds)
  - Periodic checks every 30 minutes
  - Checks when user returns to the tab (visibility change)
  - Update notification dialog with "Update Now" and "Remind Later" options
  - Auto-dismisses after 60 seconds if no action taken
  - Automatically disabled in development environment
  - Silent failure handling for network errors

## [0.6.3] - 2026-01-09

### Security
- **SVG Rendering Hardening** - Render preview/symbol SVG via data-URI `<img>` to avoid DOM injection
- **Service Worker Validation** - Cache only same-origin GET requests with stricter response validation
- **Security Headers** - Added CSP, Referrer-Policy, and Permissions-Policy; moved theme init script to an external file for CSP compatibility

### Fixed
- **Settings Storage Robustness** - Prevent crashes when saved settings JSON in localStorage is corrupted
- **Linting Noise** - Excluded bundled Monaco Editor files from ESLint scanning

### Changed
- **HTML Export** - Exported HTML now embeds the formula as a data-URI image instead of inlining raw SVG
- **Docker Reproducibility** - Pinned the production Nginx base image version (removed `:latest`)

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
