# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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