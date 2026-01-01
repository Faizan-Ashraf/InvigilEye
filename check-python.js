#!/usr/bin/env node
/**
 * Helper script to check if Python is installed and required packages are available
 * Run this before starting the detection
 */

const { execSync } = require('child_process');

function checkPython() {
  const pythonCommands = ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf-8' });
      console.log(`✅ Found ${cmd}: ${version.trim()}`);
      return cmd;
    } catch (err) {
      console.warn(`❌ ${cmd} not found`);
    }
  }
  
  return null;
}

function checkPythonPackages(pythonCmd) {
  const requiredPackages = ['cv2', 'numpy', 'torch', 'ultralytics'];
  
  for (const pkg of requiredPackages) {
    try {
      execSync(`${pythonCmd} -c "import ${pkg}"`, { stdio: 'pipe' });
      console.log(`✅ Package ${pkg} is installed`);
    } catch (err) {
      console.warn(`❌ Package ${pkg} is NOT installed`);
      return false;
    }
  }
  
  return true;
}

console.log('Checking Python environment...\n');

const pythonCmd = checkPython();

if (!pythonCmd) {
  console.error('\n❌ Python is not installed or not in PATH!');
  console.error('Please install Python 3.8+ from https://www.python.org/downloads/');
  process.exit(1);
}

console.log('\nChecking required Python packages...\n');

if (!checkPythonPackages(pythonCmd)) {
  console.error('\n❌ Some required Python packages are missing!');
  console.error('Please install them using:');
  console.error(`  ${pythonCmd} -m pip install opencv-python numpy torch torchvision torchaudio ultralytics`);
  process.exit(1);
}

console.log('\n✅ All checks passed! Python environment is ready.');
