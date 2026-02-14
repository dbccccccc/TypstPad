export const messages = {
  app: {
    title: 'TypstPad - Online Typst Formula Editor',
    titleDocs: 'TypstPad Docs',
    titleAbout: 'About TypstPad',
    titleNotFound: 'Page Not Found - TypstPad',
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
    retry: 'Retry',
    comingSoon: 'Coming soon',
  },
  ocr: {
    button: 'OCR',
    intro: {
      title: 'OCR',
      description: 'Upload a screenshot or photo to extract text.',
      fileSizeLimit: 'File size limit: {maxMb} MB',
      limitInfo: 'Daily limit: {count}/{limit}',
      remaining: 'Remaining today: {remaining}',
      resetsAt: 'Resets at: {time}',
      choosePhoto: 'Choose photo',
      login: 'Login to continue',
    },
    error: {
      limitReached: 'OCR limit reached for today. Try again later.',
      fileTooLarge: 'Image is too large. Maximum size is {maxMb} MB.',
      emptyResult: 'OCR returned no text.',
      failed: 'OCR failed. Please try again.',
    },
  },
  auth: {
    login: {
      title: 'Sign in with GitHub',
      description: 'A login popup will open and close after you sign in.',
      github: 'Continue with GitHub',
    },
    error: {
      popupBlocked: 'Login popup was blocked. Please allow popups and try again.',
      loginFailed: 'Login failed. Please try again.',
    },
  },
  header: {
    github: 'GitHub',
    theme: 'Theme',
    savedFormulas: 'Saved Formulas',
    settings: 'Settings',
    language: 'Language',
    login: 'Login',
    account: 'Account',
    logout: 'Logout',
    emailUnavailable: 'Email unavailable',
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
  navigation: {
    pages: 'Pages',
    editor: 'Editor',
    docs: 'Docs',
    about: 'About',
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
  docs: {
    title: 'Documentation',
    description: 'Learn the editor workflow and common Typst snippets quickly.',
    quickStart: {
      title: 'Quick Start',
      step1: 'Write Typst code in the input panel.',
      step2: 'Check the rendered result in the preview panel.',
      step3: 'Use export buttons to copy or download image/code/share links.',
    },
    link: {
      typst: 'Open Typst Official Docs',
    },
  },
  about: {
    title: 'About TypstPad',
    description: 'TypstPad is a focused Typst formula workspace for fast editing and sharing.',
    mission: {
      title: 'Mission',
      body: 'Make formula writing smooth on both desktop and mobile with practical export options.',
    },
    features: {
      title: 'What You Get',
      item1: 'Real-time Typst preview while editing.',
      item2: 'Symbol toolbar and autocomplete support.',
      item3: 'Export to PNG/JPG/SVG/HTML/Typst.',
      item4: 'Share links and local/account formula saves.',
      item5: 'Theme, language, and accessibility focused UI.',
    },
    links: {
      title: 'Project Links',
      github: 'GitHub Repository',
      license: 'MIT License',
      typstDocs: 'Typst Docs',
    },
  },
  notFound: {
    title: 'Page not found',
    description: 'The page you requested does not exist. You can return to the editor.',
    backToEditor: 'Back to editor',
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
    error: {
      copyFailed: 'Copy failed. Please check clipboard permissions and try again.',
    },
  },
  formulas: {
    title: 'Saved Formulas',
    tabs: {
      local: 'Local',
      account: 'Account',
    },
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
    account: {
      emptyTitle: 'No account saves yet',
      emptyHint: 'Save formulas to your account to see them here.',
      loginTitle: 'Login to view account saves',
      loginHint: 'Sign in to access formulas saved to your account.',
      error: {
        loadFailed: 'Failed to load account saves. Please try again.',
        saveFailed: 'Failed to save to your account. Please try again.',
        updateFailed: 'Failed to update account save. Please try again.',
        deleteFailed: 'Failed to delete account save. Please try again.',
      },
    },
  },
  saveFormula: {
    title: 'Save Formula',
    description: 'Give it a name, or leave it blank to auto-generate one.',
    locationLabel: 'Save to',
    location: {
      local: 'Local',
      account: 'Account',
    },
    accountHint: 'Save to your account to access on any device.',
    accountComingSoon: 'Account saves are coming soon.',
    loginToSave: 'Login to save to your account.',
    nameLabel: 'Name (optional)',
    placeholder: 'Enter a name for this formula',
    autoName: 'Auto name: "{name}"',
    previewLabel: 'Preview',
    previewEmpty: 'No content to preview.',
    saveAccount: 'Save to account',
  },
  fontManager: {
    title: 'Font Manager',
    description: 'Install only the fonts you need. Default fonts can be removed and restored later.',
    bundledTitle: 'Bundled Fonts',
    uploadedTitle: 'Uploaded Fonts',
    upload: 'Upload Fonts',
    uploadHelp: 'Supports .otf and .ttf. Duplicate fonts are ignored. Uploaded fonts are stored locally in this browser.',
    uploadError: 'Failed to upload fonts. Please try again.',
    toggleError: 'Failed to update bundled fonts. Please try again.',
    removeError: 'Failed to remove uploaded font. Please try again.',
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
    resizeInput: 'Resize input area',
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
