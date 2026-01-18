import type { MessageSchema } from './en'

const messages: MessageSchema = {
  app: {
    title: 'TypstPad - 在线 Typst 公式编辑器',
  },
  common: {
    loading: '加载中...',
    input: '输入',
    output: '输出',
    save: '保存',
    cancel: '取消',
    formula: '公式',
  },
  header: {
    github: 'GitHub',
    theme: '主题',
    savedFormulas: '已保存公式',
    settings: '设置',
    language: '语言',
  },
  theme: {
    light: '浅色',
    system: '系统',
    dark: '深色',
  },
  language: {
    systemSuffix: '系统',
    name: {
      en: 'English',
      zhCN: '简体中文',
    },
  },
  settings: {
    title: '设置',
    section: {
      editor: '编辑器设置',
      output: '输出设置',
      formula: '公式模式',
    },
    fontSize: {
      label: '字体大小',
      help: '调整编辑器字体大小',
    },
    lineNumbers: {
      label: '显示行号',
      help: '在编辑器中显示行号',
    },
    startupBehavior: {
      label: '启动行为',
      help: '选择应用打开时显示内容',
      lastEdit: '上次编辑',
      blank: '空白',
    },
    autoComplete: {
      label: '自动补全',
      help: '输入时显示 Typst 符号建议',
    },
    layoutMode: {
      label: '布局模式',
      help: '选择输入与输出的排列方式',
      vertical: '上下布局',
      sideBySide: '左右布局',
    },
    pngScale: {
      label: 'PNG 导出倍率',
      help: '倍率越高图像越清晰',
      option1: '1x',
      option2: '2x（推荐）',
      option3: '3x',
      option4: '4x',
    },
    darkPreview: {
      label: '强制深色预览背景',
      help: '在深色模式下启用深色预览背景，公式颜色会被反转以提高可读性。',
    },
    simplifiedMode: {
      label: '简化公式模式',
      help: '自动使用 $ ... $ 包裹为数学模式',
    },
    reset: {
      button: '重置所有设置',
      confirm: '确定要重置所有设置吗？',
    },
  },
  export: {
    section: {
      copy: '复制到剪贴板',
      download: '下载文件',
    },
    copy: {
      png: '复制 PNG 图片',
      typst: 'Typst 代码',
      svg: 'SVG 代码',
      html: 'HTML 代码',
    },
    download: {
      png: 'PNG 格式',
      jpg: 'JPG 格式',
      svg: 'SVG 格式',
      typst: 'Typst 文件',
      svgFile: 'SVG 文件',
      html: 'HTML 文件',
      transparent: '透明',
      whiteBg: '白色背景',
      vector: '矢量',
    },
    button: {
      image: '导出图片',
      code: '导出代码',
      share: '分享',
      copied: '已复制',
    },
  },
  formulas: {
    title: '已保存公式',
    clearAll: '清空',
    clearAllConfirm: '确定要删除所有已保存公式吗？',
    emptyTitle: '还没有保存的公式',
    emptyHint: '在{input}区域使用“{save}”按钮来保存公式',
    renamePrompt: '输入新名称：',
    deleteConfirm: '删除“{name}”？',
    action: {
      load: '加载',
      rename: '重命名',
      delete: '删除',
    },
    untitled: '未命名',
  },
  saveFormula: {
    title: '保存公式',
    nameLabel: '名称（可选）',
    placeholder: '输入公式名称',
  },
  preview: {
    loading: {
      compiling: '编译中...',
      loadingCompiler: '加载编译器...',
      loadingRenderer: '加载渲染器...',
      loadingFonts: '加载字体（{loaded}/{total}）',
      initializing: '初始化...',
      ready: '就绪',
    },
    empty: '没有可预览内容',
    alt: 'Typst 公式预览',
  },
  error: {
    title: '修复问题',
    messageLabel: '错误信息',
    howToFix: '解决方法',
    documentation: '查看 Typst 文档',
  },
  editor: {
    loading: '正在加载编辑器...',
  },
  math: {
    category: {
      common: '常用',
      greek: '希腊字母',
      fractions: '分数',
      scripts: '上下标',
      limits: '极限',
      trig: '三角',
      integrals: '积分',
      sums: '求和',
      brackets: '括号',
      matrices: '矩阵',
      arrows: '箭头',
    },
  },
}

export default messages
