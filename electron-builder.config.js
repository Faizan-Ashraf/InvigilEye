module.exports = {
  appId: 'com.invigleye.app',
  productName: 'InvigilEye',
  directories: { 
    output: 'dist',
    buildResources: 'public'
  },
  files: [
    'main/**/*',
    'renderer/dist/**/*',
    'backend/**/*',
    '!backend/uploads/*',
    'backend/uploads/README.md',
    'db/.gitkeep',
    '!db/*.db',
    'package.json',
    'node_modules/**/*'
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: [
          'x64'
        ]
      },
      {
        target: 'portable',
        arch: [
          'x64'
        ]
      }
    ],
    icon: 'public/icon.ico',
    certificateFile: null,
    certificatePassword: null,
    sign: null,
    signDlls: false
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'InvigilEye'
  },
  // Disable code signing and winCodeSign to avoid symbolic link issues on non-elevated shells
  sign: null,
  signDlls: false,
  signingHashAlgorithms: [],
  // Disable native module rebuilding
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  npmRebuild: false,
  generateUpdatesFilesForAllChannels: true,
  // Skip downloading winCodeSign tool (causes symlink errors without elevated privileges)
  certificateFile: null,
  certificatePassword: null
};
