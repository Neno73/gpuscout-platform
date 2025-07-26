#!/usr/bin/env node

/**
 * Setup Verification Script
 * Verifies that the AI-enhanced development system is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying GPUScout AI Development System Setup...\n');

const checks = [];

/**
 * Check if required directories exist
 */
function checkDirectories() {
  const requiredDirs = [
    '.claude/state',
    '.claude/logs', 
    '.claude/scripts',
    '.claude/commands',
    'registry',
    'specs/features',
    'specs/tests'
  ];
  
  const missing = requiredDirs.filter(dir => !fs.existsSync(dir));
  
  if (missing.length === 0) {
    checks.push({ name: 'Directory Structure', status: '✅', details: 'All required directories exist' });
  } else {
    checks.push({ name: 'Directory Structure', status: '❌', details: `Missing: ${missing.join(', ')}` });
  }
}

/**
 * Check if configuration files exist
 */
function checkConfigFiles() {
  const requiredFiles = [
    '.claude/settings.json',
    '.claude/cheatsheet.md',
    'registry/endpoints.json',
    'registry/components.json',
    'registry/schemas.json',
    'registry/deployments.json'
  ];
  
  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length === 0) {
    checks.push({ name: 'Configuration Files', status: '✅', details: 'All config files present' });
  } else {
    checks.push({ name: 'Configuration Files', status: '❌', details: `Missing: ${missing.join(', ')}` });
  }
}

/**
 * Check if custom commands exist
 */
function checkCustomCommands() {
  const requiredCommands = [
    '.claude/commands/task-select.md',
    '.claude/commands/task-status.md',
    '.claude/commands/registry-check.md',
    '.claude/commands/subagent-research.md',
    '.claude/commands/dependency-check.md'
  ];
  
  const missing = requiredCommands.filter(cmd => !fs.existsSync(cmd));
  
  if (missing.length === 0) {
    checks.push({ name: 'Custom Commands', status: '✅', details: `${requiredCommands.length} commands available` });
  } else {
    checks.push({ name: 'Custom Commands', status: '❌', details: `Missing: ${missing.length} commands` });
  }
}

/**
 * Check if helper scripts exist and are executable
 */
function checkHelperScripts() {
  const requiredScripts = [
    '.claude/scripts/update-registry.js',
    '.claude/scripts/update-docs.js',
    '.claude/scripts/update-memory.js',
    '.claude/scripts/update-cheatsheet.js'
  ];
  
  const missing = requiredScripts.filter(script => !fs.existsSync(script));
  
  if (missing.length === 0) {
    checks.push({ name: 'Helper Scripts', status: '✅', details: `${requiredScripts.length} automation scripts ready` });
  } else {
    checks.push({ name: 'Helper Scripts', status: '❌', details: `Missing: ${missing.join(', ')}` });
  }
}

/**
 * Check if specifications are complete
 */
function checkSpecifications() {
  const requiredSpecs = [
    'specs/features/alerts-notifications.md'
  ];
  
  const requiredTests = [
    'specs/tests/authentication-system.test.md',
    'specs/tests/portfolio-management-system.test.md',  
    'specs/tests/ai-powered-analytics.test.md',
    'specs/tests/market-intelligence-pricing.test.md'
  ];
  
  const missingSpecs = requiredSpecs.filter(spec => !fs.existsSync(spec));
  const missingTests = requiredTests.filter(test => !fs.existsSync(test));
  
  if (missingSpecs.length === 0 && missingTests.length === 0) {
    checks.push({ name: 'Specifications', status: '✅', details: 'All feature specs and tests ready' });
  } else {
    const missing = [...missingSpecs, ...missingTests];
    checks.push({ name: 'Specifications', status: '❌', details: `Missing: ${missing.length} files` });
  }
}

/**
 * Check hooks configuration
 */
function checkHooksConfiguration() {
  try {
    const settings = JSON.parse(fs.readFileSync('.claude/settings.json', 'utf8'));
    
    if (settings.hooks && 
        settings.hooks.PreToolUse && 
        settings.hooks.PostToolUse && 
        settings.hooks.Stop) {
      checks.push({ name: 'Hooks Configuration', status: '✅', details: 'Pre/Post/Stop hooks configured' });
    } else {
      checks.push({ name: 'Hooks Configuration', status: '⚠️', details: 'Incomplete hooks configuration' });
    }
  } catch (err) {
    checks.push({ name: 'Hooks Configuration', status: '❌', details: 'Settings file invalid or unreadable' });
  }
}

/**
 * Check registry structure
 */
function checkRegistryStructure() {
  try {
    const endpoints = JSON.parse(fs.readFileSync('registry/endpoints.json', 'utf8'));
    const components = JSON.parse(fs.readFileSync('registry/components.json', 'utf8'));
    const schemas = JSON.parse(fs.readFileSync('registry/schemas.json', 'utf8'));
    
    if (endpoints.endpoints && 
        components.components && 
        schemas.schemas &&
        endpoints.metadata &&
        components.metadata &&
        schemas.metadata) {
      checks.push({ name: 'Registry Structure', status: '✅', details: 'All registries properly structured' });
    } else {
      checks.push({ name: 'Registry Structure', status: '⚠️', details: 'Registry structure incomplete' });
    }
  } catch (err) {
    checks.push({ name: 'Registry Structure', status: '❌', details: 'Registry files invalid' });
  }
}

/**
 * Check documentation
 */
function checkDocumentation() {
  const requiredDocs = [
    '.claude/SUB_AGENT_GUIDE.md',
    'CLAUDE.md'
  ];
  
  const missing = requiredDocs.filter(doc => !fs.existsSync(doc));
  
  if (missing.length === 0) {
    checks.push({ name: 'Documentation', status: '✅', details: 'Core documentation complete' });
  } else {
    checks.push({ name: 'Documentation', status: '❌', details: `Missing: ${missing.join(', ')}` });
  }
}

// Run all checks
checkDirectories();
checkConfigFiles(); 
checkCustomCommands();
checkHelperScripts();
checkSpecifications();
checkHooksConfiguration();
checkRegistryStructure();
checkDocumentation();

// Display results
console.log('📊 SETUP VERIFICATION RESULTS\n');
console.log('='.repeat(50));

let allPassed = true;
checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(25)} ${check.details}`);
  if (check.status === '❌') allPassed = false;
});

console.log('='.repeat(50));

if (allPassed) {
  console.log('\n🎉 SETUP COMPLETE!');
  console.log('\nYour AI-enhanced development system is ready. Next steps:');
  console.log('1. Run `/dependency-check` to verify MCP tools');
  console.log('2. Use `/task:select TASK-001` to begin development');
  console.log('3. Leverage `/subagent:research` for parallel research');
  
  // Show available tasks
  try {
    const specContent = fs.readFileSync('specs/spec.md', 'utf8');
    const taskMatches = specContent.match(/TASK-\d+.*?:/g);
    if (taskMatches) {
      console.log('\n📋 Available Tasks:');
      taskMatches.forEach(task => {
        console.log(`   - ${task.replace(':', '')}`);
      });
    }
  } catch (err) {
    // Spec file not found
  }
  
} else {
  console.log('\n⚠️  SETUP INCOMPLETE');
  console.log('\nPlease fix the issues marked with ❌ before starting development.');
  console.log('Run this script again after making corrections.');
}

console.log('\n📖 For detailed guidance, see:');
console.log('   - .claude/cheatsheet.md (development reference)');  
console.log('   - .claude/SUB_AGENT_GUIDE.md (sub-agent patterns)');
console.log('   - CLAUDE.md (project context)');

process.exit(allPassed ? 0 : 1);