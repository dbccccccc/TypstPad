# TypstPad

A simple and elegant online Typst formula editor with real-time preview.

<img width="1559" height="1127" alt="theme-comparison" src="https://github.com/user-attachments/assets/da236fd3-dcad-4064-a045-81bf7a52a9c9" />


![License](https://img.shields.io/badge/license-MIT-green)
![ghcr pulls](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghcr-badge.elias.eu.org%2Fapi%2Fdbccccccc%2FTypstPad%2FTypstPad&query=downloadCount&label=ghcr+pulls&logo=github)

## ✨ Features

- 🎨 **Real-time Preview** - See your Typst formulas rendered instantly
- 📝 **Monaco Editor** - Professional code editing experience with syntax highlighting
- 🌓 **Theme Support** - Light, dark, and system theme modes
- 📤 **Multiple Export Formats**
  - PNG (transparent background)
  - JPG (white background)
  - SVG (vector graphics)
  - HTML
  - Typst source code
- 📋 **Clipboard Support** - Copy images and code directly to clipboard
- 🔗 **Share Links** - Generate shareable URLs with encoded formulas
- ⚙️ **Customizable Settings**
  - Adjustable font size
  - Line numbers toggle
  - PNG export scale (1x-4x)
  - Dark mode preview options

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/dbccccccc/TypstPad.git

# Navigate to project directory
cd TypstPad

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the application.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🐳 Docker Deployment

### Using Pre-built Image

Pull and run the latest stable version from GitHub Container Registry:

```bash
# Pull the latest image
docker pull ghcr.io/dbccccccc/typstpad:latest

# Run the container
docker run -d -p 8080:80 --name typstpad ghcr.io/dbccccccc/typstpad:latest

# Access the application
# Open http://localhost:8080 in your browser
```

### Using Specific Version

```bash
# Pull a specific version
docker pull ghcr.io/dbccccccc/typstpad:v1.0.0

# Run the container
docker run -d -p 8080:80 ghcr.io/dbccccccc/typstpad:v1.0.0
```

### Build Docker Image Locally

```bash
# Build the image
docker build -t typstpad .

# Run the container
docker run -d -p 8080:80 --name typstpad typstpad

# Stop the container
docker stop typstpad

# Remove the container
docker rm typstpad
```

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  typstpad:
    image: ghcr.io/dbccccccc/typstpad:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

### Important Notes

- The Docker image includes Nginx with required CORS headers for SharedArrayBuffer support
- Default port is 80 inside the container, map it to any host port you prefer
- Currently supports linux/amd64 platform

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Editor**: Monaco Editor
- **Syntax Highlighting**: Shiki
- **Typst Rendering**: @myriaddreamin/typst.ts
- **UI Components**: Radix UI
- **Icons**: Lucide React

## 📁 Project Structure

```
typstpad/
├── src/
│   ├── components/
│   │   ├── Editor/           # Monaco editor component
│   │   ├── Preview/          # Typst preview component
│   │   ├── ExportPanel/      # Export and share functionality
│   │   ├── SettingsDialog/   # Settings configuration
│   │   ├── Header/           # Application header
│   │   ├── ErrorDisplay/     # Error message display
│   │   └── ui/               # Reusable UI components
│   ├── contexts/
│   │   └── ThemeContext.tsx  # Theme management
│   ├── services/
│   │   └── typst.ts          # Typst compilation service
│   ├── utils/
│   │   ├── export.ts         # Export utilities
│   │   ├── share.ts          # Share URL generation
│   │   └── shikiSetup.ts     # Syntax highlighting setup
│   ├── grammars/
│   │   └── typst.tmLanguage.json  # Typst language grammar
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── public/                   # Static assets
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
└── tailwind.config.js        # Tailwind CSS configuration
```

## 📖 Usage

### Basic Example

1. Enter your Typst formula in the editor:
   ```typst
   $ sum_(i=1)^n i = (n(n+1))/2 $
   ```

2. See the rendered preview in real-time

3. Export or share:
   - Click "Export Image" to download as PNG/JPG/SVG
   - Click "Export Code" to copy/download the source code
   - Click "Share" to generate a shareable URL

### Settings

Access settings by clicking the gear icon in the header.

### Keyboard Shortcuts

- Standard Monaco editor shortcuts apply
- See Monaco Editor documentation for complete list

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Typst](https://typst.app/) - The typesetting system
- [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) - Typst WebAssembly compiler
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Shiki](https://shiki.matsu.io/) - Syntax highlighter
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [latexlive.com](https://www.latexlive.com/) - Part of the design is inspired by this tool

## 🗺️ Roadmap

- [ ] Template library for common formulas and expressions
- [ ] Multi-language support
- [ ] More export format support

---

Made with ❤️ using [Typst](https://typst.app/)
