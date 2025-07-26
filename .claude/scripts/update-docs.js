#!/usr/bin/env node

/**
 * Documentation Update Script
 * Automatically generates and updates API documentation from implemented code
 */

const fs = require('fs');
const path = require('path');

const task = process.argv[2];
if (!task) {
  console.error('Usage: update-docs.js TASK-XXX');
  process.exit(1);
}

console.log(`📚 Updating documentation for task: ${task}`);

/**
 * Extract JSDoc comments from source files
 */
function extractJSDoc(content) {
  const jsdocPattern = /\/\*\*([\s\S]*?)\*\//g;
  const docs = [];
  let match;
  
  while ((match = jsdocPattern.exec(content)) !== null) {
    const comment = match[1];
    docs.push({
      raw: match[0],
      content: comment.replace(/^\s*\*/gm, '').trim()
    });
  }
  
  return docs;
}

/**
 * Update API documentation from endpoints
 */
function updateAPIDocumentation() {
  const endpointsRegistry = JSON.parse(fs.readFileSync('registry/endpoints.json', 'utf8'));
  const newEndpoints = endpointsRegistry.endpoints.filter(e => e.task === task);
  
  if (newEndpoints.length === 0) {
    console.log('ℹ️  No new API endpoints to document');
    return;
  }
  
  let apiDocs = '# API Documentation\n\n';
  apiDocs += `Generated on: ${new Date().toISOString()}\n\n`;
  apiDocs += `## Endpoints added in ${task}\n\n`;
  
  newEndpoints.forEach(endpoint => {
    apiDocs += `### ${endpoint.method} ${endpoint.path}\n\n`;
    
    try {
      const handlerContent = fs.readFileSync(endpoint.handler, 'utf8');
      const jsdocs = extractJSDoc(handlerContent);
      
      if (jsdocs.length > 0) {
        apiDocs += `**Description:** ${jsdocs[0].content}\n\n`;
      }
      
      // Extract request/response types from TypeScript
      const requestTypeMatch = handlerContent.match(/Request<.*?>/);
      const responseTypeMatch = handlerContent.match(/Response<.*?>/);
      
      if (requestTypeMatch) {
        apiDocs += `**Request Type:** \`${requestTypeMatch[0]}\`\n\n`;
      }
      
      if (responseTypeMatch) {
        apiDocs += `**Response Type:** \`${responseTypeMatch[0]}\`\n\n`;
      }
      
      // Extract status codes
      const statusCodes = [...handlerContent.matchAll(/\.status\((\d+)\)/g)];
      if (statusCodes.length > 0) {
        apiDocs += '**Status Codes:**\n';
        statusCodes.forEach(([, code]) => {
          apiDocs += `- ${code}\n`;
        });
        apiDocs += '\n';
      }
      
    } catch (err) {
      apiDocs += `*Handler file not found or unreadable*\n\n`;
    }
    
    apiDocs += '---\n\n';
  });
  
  // Update or create API documentation
  const docsDir = 'docs';
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  const apiDocsPath = path.join(docsDir, 'api.md');
  if (fs.existsSync(apiDocsPath)) {
    const existingDocs = fs.readFileSync(apiDocsPath, 'utf8');
    fs.writeFileSync(apiDocsPath, existingDocs + '\n' + apiDocs);
  } else {
    fs.writeFileSync(apiDocsPath, apiDocs);
  }
  
  console.log(`✅ API documentation updated with ${newEndpoints.length} endpoints`);
}

/**
 * Update component documentation
 */
function updateComponentDocumentation() {
  const componentsRegistry = JSON.parse(fs.readFileSync('registry/components.json', 'utf8'));
  const newComponents = componentsRegistry.components.filter(c => c.task === task);
  
  if (newComponents.length === 0) {
    console.log('ℹ️  No new components to document');
    return;
  }
  
  let componentDocs = '# Component Documentation\n\n';
  componentDocs += `Generated on: ${new Date().toISOString()}\n\n`;
  componentDocs += `## Components added in ${task}\n\n`;
  
  newComponents.forEach(component => {
    componentDocs += `## ${component.name}\n\n`;
    componentDocs += `**Type:** ${component.type}\n`;
    componentDocs += `**File:** ${component.file}\n\n`;
    
    try {
      const componentContent = fs.readFileSync(component.file, 'utf8');
      const jsdocs = extractJSDoc(componentContent);
      
      if (jsdocs.length > 0) {
        componentDocs += `**Description:**\n${jsdocs[0].content}\n\n`;
      }
      
      // Extract props interface
      const propsMatch = componentContent.match(/interface\s+\w*Props\s*{[\s\S]*?}/);
      if (propsMatch) {
        componentDocs += '**Props:**\n```typescript\n';
        componentDocs += propsMatch[0];
        componentDocs += '\n```\n\n';
      }
      
      // Extract usage example from JSDoc
      const exampleMatch = componentContent.match(/@example\s*([\s\S]*?)(?=\*\/|\*\s*@)/);
      if (exampleMatch) {
        componentDocs += '**Example:**\n```jsx\n';
        componentDocs += exampleMatch[1].replace(/^\s*\*/gm, '').trim();
        componentDocs += '\n```\n\n';
      }
      
    } catch (err) {
      componentDocs += `*Component file not found or unreadable*\n\n`;
    }
    
    componentDocs += '---\n\n';
  });
  
  // Update or create component documentation
  const docsDir = 'docs';
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  const componentDocsPath = path.join(docsDir, 'components.md');
  if (fs.existsSync(componentDocsPath)) {
    const existingDocs = fs.readFileSync(componentDocsPath, 'utf8');
    fs.writeFileSync(componentDocsPath, existingDocs + '\n' + componentDocs);
  } else {
    fs.writeFileSync(componentDocsPath, componentDocs);
  }
  
  console.log(`✅ Component documentation updated with ${newComponents.length} components`);
}

/**
 * Update README with new features
 */
function updateReadme() {
  const readmePath = 'README.md';
  if (!fs.existsSync(readmePath)) {
    console.log('ℹ️  No README.md found to update');
    return;
  }
  
  const readme = fs.readFileSync(readmePath, 'utf8');
  const taskDescription = getTaskDescription(task);
  
  if (!taskDescription) {
    console.log('ℹ️  No task description found for README update');
    return;
  }
  
  // Find the Features section or create it
  let updatedReadme = readme;
  if (readme.includes('## Features')) {
    // Add to existing features section
    const featuresRegex = /(## Features[\s\S]*?)(\n## |\n# |$)/;
    const match = readme.match(featuresRegex);
    if (match) {
      const existingFeatures = match[1];
      const newFeature = `- ✅ **${taskDescription.title}**: ${taskDescription.summary}\n`;
      const updatedFeatures = existingFeatures + newFeature;
      updatedReadme = readme.replace(featuresRegex, updatedFeatures + match[2]);
    }
  } else {
    // Create features section
    const featuresSection = `\n## Features\n\n- ✅ **${taskDescription.title}**: ${taskDescription.summary}\n\n`;
    // Insert after project description
    const insertPoint = readme.indexOf('\n## ') !== -1 ? readme.indexOf('\n## ') : readme.length;
    updatedReadme = readme.slice(0, insertPoint) + featuresSection + readme.slice(insertPoint);
  }
  
  fs.writeFileSync(readmePath, updatedReadme);
  console.log('✅ README.md updated with new feature');
}

/**
 * Get task description from specs
 */
function getTaskDescription(task) {
  try {
    const specPath = `specs/features/${task}.md`;
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf8');
      const titleMatch = specContent.match(/# Feature Specification: (.+)/);
      const overviewMatch = specContent.match(/## Overview\s*([\s\S]*?)(?=\n## |\n# |$)/);
      
      if (titleMatch && overviewMatch) {
        return {
          title: titleMatch[1],
          summary: overviewMatch[1].trim().split('\n')[0]
        };
      }
    }
  } catch (err) {
    // Task description not found
  }
  return null;
}

/**
 * Update CHANGELOG
 */
function updateChangelog() {
  const changelogPath = 'CHANGELOG.md';
  const taskDescription = getTaskDescription(task);
  
  if (!taskDescription) {
    console.log('ℹ️  No task description found for changelog');
    return;
  }
  
  const version = process.env.npm_package_version || '1.0.0';
  const date = new Date().toISOString().split('T')[0];
  
  const changelogEntry = `## [${version}] - ${date}\n\n### Added\n- ${taskDescription.title}: ${taskDescription.summary}\n\n`;
  
  if (fs.existsSync(changelogPath)) {
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    // Insert after the header
    const headerEnd = changelog.indexOf('\n\n') + 2;
    const updatedChangelog = changelog.slice(0, headerEnd) + changelogEntry + changelog.slice(headerEnd);
    fs.writeFileSync(changelogPath, updatedChangelog);
  } else {
    const newChangelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${changelogEntry}`;
    fs.writeFileSync(changelogPath, newChangelog);
  }
  
  console.log('✅ CHANGELOG.md updated');
}

// Execute all documentation updates
try {
  updateAPIDocumentation();
  updateComponentDocumentation();
  updateReadme();
  updateChangelog();
  console.log(`📖 Documentation update completed for ${task}`);
} catch (error) {
  console.error('❌ Documentation update failed:', error.message);
  process.exit(1);
}