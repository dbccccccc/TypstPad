export const messages = {
  app: {
    title: 'TypstPad - Online Typst Formula Editor',
  },
  common: {
    loading: 'Loading...',
    input: 'Input',
    output: 'Output',
    save: 'Save',
    load: 'Load',
    cancel: 'Cancel',
    formula: 'Formula',
    fonts: 'Fonts',
  },
  header: {
    github: 'GitHub',
    theme: 'Theme',
    savedFormulas: 'Saved Formulas',
    settings: 'Settings',
    language: 'Language',
  },
  theme: {
    light: 'Light',
    system: 'System',
    dark: 'Dark',
  },
  language: {
    systemSuffix: 'System',
    name: {
      en: 'English',
      zhCN: '简体中文',
    },
  },
  settings: {
    title: 'Settings',
    section: {
      editor: 'Editor Settings',
      output: 'Output Settings',
      formula: 'Formula Mode',
    },
    fontSize: {
      label: 'Font Size',
      help: 'Adjust editor font size',
    },
    lineNumbers: {
      label: 'Show Line Numbers',
      help: 'Display line numbers in editor',
    },
    startupBehavior: {
      label: 'Startup Behavior',
      help: 'Choose what to show when the app opens',
      lastEdit: 'Last Edit',
      blank: 'Blank',
    },
    autoComplete: {
      label: 'Auto Complete',
      help: 'Show Typst symbol suggestions while typing',
    },
    layoutMode: {
      label: 'Layout Mode',
      help: 'Choose how input and output are arranged',
      vertical: 'Vertical',
      sideBySide: 'Side by Side',
    },
    pngScale: {
      label: 'PNG Export Scale',
      help: 'Higher scale = sharper image',
      option1: '1x',
      option2: '2x (Recommended)',
      option3: '3x',
      option4: '4x',
    },
    darkPreview: {
      label: 'Force Dark Preview Background',
      help: 'Enable dark background for preview in dark mode. Formula colors will be inverted for readability.',
    },
    simplifiedMode: {
      label: 'Simplified Formula Mode',
      help: 'Automatically wrap content in $ ... $ for math mode',
    },
    reset: {
      button: 'Reset All Settings',
      confirm: 'Are you sure you want to reset all settings?',
    },
  },
  export: {
    section: {
      copy: 'Copy to Clipboard',
      download: 'Download File',
    },
    copy: {
      png: 'Copy PNG Image',
      typst: 'Typst Code',
      svg: 'SVG Code',
      html: 'HTML Code',
    },
    download: {
      png: 'PNG Format',
      jpg: 'JPG Format',
      svg: 'SVG Format',
      typst: 'Typst File',
      svgFile: 'SVG File',
      html: 'HTML File',
      transparent: 'Transparent',
      whiteBg: 'White BG',
      vector: 'Vector',
    },
    button: {
      image: 'Export Image',
      code: 'Export Code',
      share: 'Share',
      copied: 'Copied',
    },
  },
  formulas: {
    title: 'Saved Formulas',
    clearAll: 'Clear All',
    clearAllConfirm: 'Are you sure you want to delete all saved formulas?',
    emptyTitle: 'No saved formulas yet',
    emptyHint: 'Use the "{save}" button in the {input} section to save formulas',
    renamePrompt: 'Enter new name:',
    deleteConfirm: 'Delete "{name}"?',
    action: {
      load: 'Load',
      rename: 'Rename',
      delete: 'Delete',
    },
    untitled: 'Untitled',
  },
  saveFormula: {
    title: 'Save Formula',
    nameLabel: 'Name (optional)',
    placeholder: 'Enter a name for this formula',
  },
  fontManager: {
    title: 'Font Manager',
    description: 'Install only the fonts you need. Default fonts can be removed and restored later.',
    bundledTitle: 'Bundled Fonts',
    uploadedTitle: 'Uploaded Fonts',
    upload: 'Upload Fonts',
    uploadHelp: 'Supports .otf and .ttf. Duplicate fonts are ignored. Uploaded fonts are stored locally in this browser.',
    uploadError: 'Failed to upload fonts. Please try again.',
    uploadedEmpty: 'No uploaded fonts yet.',
    install: 'Install',
    remove: 'Remove',
    defaultTag: 'Default',
    category: {
      text: 'Text',
      math: 'Math',
      mono: 'Monospace',
    },
  },
  preview: {
    loading: {
      compiling: 'Compiling...',
      loadingCompiler: 'Loading compiler...',
      loadingRenderer: 'Loading renderer...',
      loadingFonts: 'Loading fonts ({loaded}/{total})',
      initializing: 'Initializing...',
      ready: 'Ready',
    },
    empty: 'No preview content',
    alt: 'Typst formula preview',
  },
  error: {
    title: 'Fix Issue',
    messageLabel: 'Error Message',
    howToFix: 'How to Fix',
    documentation: 'View Typst Documentation',
  },
  editor: {
    loading: 'Loading editor...',
  },
  math: {
    category: {
      common: 'Common',
      greek: 'Greek',
      fractions: 'Fractions',
      scripts: 'Scripts',
      limits: 'Limits',
      trig: 'Trig',
      integrals: 'Integrals',
      sums: 'Sums',
      brackets: 'Brackets',
      matrices: 'Matrices',
      arrows: 'Arrows',
    },
  },
} as const

export type Messages = typeof messages

export type DeepString<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Record<string, unknown>
      ? DeepString<T[K]>
      : T[K]
}

export type MessageSchema = DeepString<typeof messages>

export default messages
