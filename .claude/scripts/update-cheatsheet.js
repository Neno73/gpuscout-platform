#!/usr/bin/env node

/**
 * Cheatsheet Update Script
 * Automatically updates the development cheatsheet with current system state
 */

const fs = require('fs');
const path = require('path');

const task = process.argv[2];
console.log(`📋 Updating cheatsheet${task ? ` for task: ${task}` : ''}...`);

/**
 * Update system state section
 */
function updateSystemState() {
  const cheatsheetPath = '.claude/cheatsheet.md';
  let content = fs.readFileSync(cheatsheetPath, 'utf8');
  
  // Get current metrics
  const endpointsRegistry = JSON.parse(fs.readFileSync('registry/endpoints.json', 'utf8'));
  const componentsRegistry = JSON.parse(fs.readFileSync('registry/components.json', 'utf8'));
  
  const currentTask = getCurrentTask();
  const testCoverage = getTestCoverage();
  
  // Update system state
  const systemStateRegex = /(## 🚀 Current System State[\s\S]*?)- \*\*All Specifications\*\*:/;
  const newSystemState = `## 🚀 Current System State
- **Active Task**: ${currentTask || 'None (use `/task:select TASK-XXX` to begin)'}
- **Last Updated**: ${new Date().toISOString()}
- **Total Endpoints**: ${endpointsRegistry.totalEndpoints || 0}
- **Total Components**: ${componentsRegistry.totalComponents || 0}
- **Test Coverage**: ${testCoverage}%
- **All Specifications**:`;
  
  content = content.replace(systemStateRegex, newSystemState);
  fs.writeFileSync(cheatsheetPath, content);
}

/**
 * Update API endpoints registry section
 */
function updateAPIEndpointsSection() {
  const cheatsheetPath = '.claude/cheatsheet.md';
  let content = fs.readFileSync(cheatsheetPath, 'utf8');
  
  const endpointsRegistry = JSON.parse(fs.readFileSync('registry/endpoints.json', 'utf8'));
  
  if (endpointsRegistry.endpoints.length === 0) {
    return; // No endpoints to update
  }
  
  // Group endpoints by feature
  const endpointsByFeature = {
    'Authentication': [],
    'Portfolio Management': [],
    'AI Chat Interface': [],
    'Market Intelligence & Pricing': [],
    'Alerts & Notifications': []
  };
  
  endpointsRegistry.endpoints.forEach(endpoint => {
    const path = endpoint.path.toLowerCase();
    if (path.includes('/auth')) {
      endpointsByFeature['Authentication'].push(endpoint);
    } else if (path.includes('/portfolio')) {
      endpointsByFeature['Portfolio Management'].push(endpoint);
    } else if (path.includes('/chat')) {
      endpointsByFeature['AI Chat Interface'].push(endpoint);
    } else if (path.includes('/market') || path.includes('/pricing')) {
      endpointsByFeature['Market Intelligence & Pricing'].push(endpoint);
    } else if (path.includes('/alert')) {
      endpointsByFeature['Alerts & Notifications'].push(endpoint);
    }
  });
  
  // Update each feature section
  Object.entries(endpointsByFeature).forEach(([feature, endpoints]) => {
    if (endpoints.length === 0) return;
    
    const sectionName = feature.replace(/ /g, '');
    const regex = new RegExp(`(### ${feature}\\s*\`\`\`[\\s\\S]*?)(None yet[\\s\\S]*?)(\`\`\`)`);
    
    let endpointsList = '';
    endpoints.forEach(endpoint => {
      const handlerPath = endpoint.handler.replace(/^src\//, '').replace(/\.[jt]s$/, '');
      const handlerFunction = extractHandlerFunction(endpoint.handler, endpoint.method, endpoint.path);
      endpointsList += `${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(25)} → ${handlerPath}:${handlerFunction}()\n`;
    });
    
    const replacement = `$1${endpointsList.trim()}\n$3`;
    content = content.replace(regex, replacement);
  });
  
  fs.writeFileSync(cheatsheetPath, content);
}

/**
 * Update components registry section
 */
function updateComponentsSection() {
  const cheatsheetPath = '.claude/cheatsheet.md';
  let content = fs.readFileSync(cheatsheetPath, 'utf8');
  
  const componentsRegistry = JSON.parse(fs.readFileSync('registry/components.json', 'utf8'));
  
  if (componentsRegistry.components.length === 0) {
    return; // No components to update
  }
  
  // Group components by type
  const componentsByType = {
    'Core Components': ['ui', 'chart', 'form'],
    'Shared Components': ['ui', 'util'],  
    'Layout Components': ['layout', 'page']
  };
  
  Object.entries(componentsByType).forEach(([sectionName, types]) => {
    const sectionComponents = componentsRegistry.components.filter(comp => 
      types.includes(comp.type)
    );
    
    if (sectionComponents.length === 0) return;
    
    const regex = new RegExp(`(### ${sectionName}\\s*\`\`\`[\\s\\S]*?)(None yet[\\s\\S]*?)(\`\`\`)`);
    
    let componentsList = '';
    sectionComponents.forEach(component => {
      const filePath = component.file.replace(/^src\//, '');
      componentsList += `${component.name.padEnd(15)} → ${filePath}\n`;
    });
    
    const replacement = `$1${componentsList.trim()}\n$3`;
    content = content.replace(regex, replacement);
  });
  
  fs.writeFileSync(cheatsheetPath, content);
}

/**
 * Update database schema section
 */
function updateDatabaseSection() {
  const cheatsheetPath = '.claude/cheatsheet.md';
  let content = fs.readFileSync(cheatsheetPath, 'utf8');
  
  const schemasRegistry = JSON.parse(fs.readFileSync('registry/schemas.json', 'utf8'));
  const dbSchemas = schemasRegistry.schemas.filter(schema => schema.type === 'database');
  
  if (dbSchemas.length === 0) {
    return; // No database schemas to update
  }
  
  const versionMatch = content.match(/### Current Version: ([\d.]+)/);
  const currentVersion = versionMatch ? versionMatch[1] : '0.0.0';
  const newVersion = incrementVersion(currentVersion);
  
  // Update version
  content = content.replace(/### Current Version: [\d.]+/, `### Current Version: ${newVersion}`);
  
  // Update schema definitions
  const schemaRegex = /(```sql[\s\S]*?)(None yet[\\s\\S]*?)(\n```)/;
  
  let schemaSQL = '';
  dbSchemas.forEach(schema => {
    try {
      const schemaContent = fs.readFileSync(schema.file, 'utf8');
      schemaSQL += `-- ${schema.name}\n${schemaContent}\n\n`;
    } catch (err) {
      schemaSQL += `-- ${schema.name} (file not readable)\n\n`;
    }
  });
  
  if (schemaSQL) {
    const replacement = `$1${schemaSQL.trim()}$3`;
    content = content.replace(schemaRegex, replacement);
  }
  
  fs.writeFileSync(cheatsheetPath, content);
}

/**
 * Update performance baselines
 */
function updatePerformanceBaselines() {
  const cheatsheetPath = '.claude/cheatsheet.md';
  let content = fs.readFileSync(cheatsheetPath, 'utf8');
  
  // Check if performance baseline exists
  const baselinePath = '.claude/state/performance_baseline.json';
  if (!fs.existsSync(baselinePath)) {
    return;
  }
  
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  
  // Update API response times
  const apiTimesRegex = /(- \/api\/auth\/\*: )(Not measured yet|[\d.]+ms)/g;
  content = content.replace(apiTimesRegex, (match, prefix, current) => {
    const endpoint = match.match(/\/api\/(\w+)/)[1];
    const timing = baseline[endpoint] ? `${baseline[endpoint]}ms` : 'Not measured yet';
    return prefix + timing;
  });
  
  fs.writeFileSync(cheatsheetPath, content);
}

/**
 * Update blockers and issues section
 */
function updateBlockersSection() {
  const cheatsheetPath = '.claude/cheatsheet.md';
  let content = fs.readFileSync(cheatsheetPath, 'utf8');
  
  const blockersPath = '.claude/state/blockers.json';
  if (!fs.existsSync(blockersPath)) {
    return;
  }
  
  const blockers = JSON.parse(fs.readFileSync(blockersPath, 'utf8'));
  
  if (blockers.length === 0) {
    return;
  }
  
  const blockersRegex = /(## 🚨 Current Blockers\/Issues[\s\S]*?```[\s\S]*?)(None yet[\\s\\S]*?)(\n```)/;
  
  let blockersList = '';
  blockers.forEach(blocker => {
    const icon = blocker.type === 'BLOCKER' ? '🛑' : blocker.type === 'ISSUE' ? '⚠️' : 'ℹ️';
    blockersList += `- [ ] ${icon} ${blocker.type}: ${blocker.description}\n`;
  });
  
  const replacement = `$1${blockersList.trim()}$3`;
  content = content.replace(blockersRegex, replacement);
  
  fs.writeFileSync(cheatsheetPath, content);
}

/**
 * Helper functions
 */
function getCurrentTask() {
  try {
    return fs.readFileSync('.claude/state/current_task.txt', 'utf8').trim();
  } catch (err) {
    return null;
  }
}

function getTestCoverage() {
  try {
    const coveragePath = 'coverage/coverage-summary.json';
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      return Math.round(coverage.total.lines.pct);
    }
  } catch (err) {
    // Coverage not available
  }
  return 0;
}

function extractHandlerFunction(handlerPath, method, endpoint) {
  try {
    const content = fs.readFileSync(handlerPath, 'utf8');
    
    // Common function name patterns
    const patterns = [
      new RegExp(`export.*function\\s+(\\w*${method.toLowerCase()}\\w*)`, 'i'),
      new RegExp(`const\\s+(\\w*${method.toLowerCase()}\\w*)\\s*=`, 'i'),
      new RegExp(`function\\s+(\\w*${endpoint.split('/').pop()}\\w*)`, 'i'),
      /export.*function\s+(\w+)/,
      /const\s+(\w+)\s*=/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return 'handler';
  } catch (err) {
    return 'handler';
  }
}

function incrementVersion(version) {
  const parts = version.split('.').map(Number);
  parts[2]++; // Increment patch version
  return parts.join('.');
}

// Execute all updates
try {
  updateSystemState();
  updateAPIEndpointsSection();
  updateComponentsSection();
  updateDatabaseSection();
  updatePerformanceBaselines();
  updateBlockersSection();
  
  console.log('✅ Cheatsheet updated successfully');
} catch (error) {
  console.error('❌ Cheatsheet update failed:', error.message);
  process.exit(1);
}