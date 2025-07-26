#!/usr/bin/env node

/**
 * Registry Update Script
 * Automatically updates registry files when new endpoints, components, or schemas are created
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const task = process.argv[2];
if (!task) {
  console.error('Usage: update-registry.js TASK-XXX');
  process.exit(1);
}

console.log(`📝 Updating registry for task: ${task}`);

/**
 * Update endpoints registry by scanning source files
 */
function updateEndpointsRegistry() {
  const registryPath = 'registry/endpoints.json';
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  
  // Scan for new endpoints in common locations
  const endpointPatterns = [
    /app\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g,
    /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g,
    /\/api\/[^\s'"`)]+/g
  ];
  
  const sourceFiles = [
    'src/routes/',
    'src/controllers/',
    'src/api/',
    'pages/api/' // Next.js API routes
  ];
  
  let newEndpoints = [];
  
  sourceFiles.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true });
      files.forEach(file => {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          try {
            const content = fs.readFileSync(path.join(dir, file), 'utf8');
            endpointPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(content)) !== null) {
                const method = match[1]?.toUpperCase();
                const endpoint = match[2] || match[0];
                
                if (endpoint && !registry.endpoints.find(e => e.path === endpoint && e.method === method)) {
                  newEndpoints.push({
                    path: endpoint,
                    method: method || 'GET',
                    handler: path.join(dir, file),
                    added: new Date().toISOString(),
                    task: task,
                    id: crypto.createHash('sha256').update(`${method}:${endpoint}`).digest('hex').substring(0, 8)
                  });
                }
              }
            });
          } catch (err) {
            // Skip files that can't be read
          }
        }
      });
    }
  });
  
  if (newEndpoints.length > 0) {
    registry.endpoints.push(...newEndpoints);
    registry.totalEndpoints = registry.endpoints.length;
    registry.lastUpdated = new Date().toISOString();
    
    // Update method counts
    registry.endpoints.forEach(endpoint => {
      registry.byMethod[endpoint.method] = (registry.byMethod[endpoint.method] || 0) + 1;
    });
    
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    console.log(`✅ Added ${newEndpoints.length} new endpoints`);
  }
}

/**
 * Update components registry by scanning React components
 */
function updateComponentsRegistry() {
  const registryPath = 'registry/components.json';
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  
  const componentPatterns = [
    /export\s+(default\s+)?function\s+([A-Z][a-zA-Z0-9]+)/g,
    /export\s+const\s+([A-Z][a-zA-Z0-9]+)\s*=/g,
    /const\s+([A-Z][a-zA-Z0-9]+)\s*=.*forwardRef/g
  ];
  
  const componentDirs = [
    'src/components/',
    'components/',
    'src/pages/',
    'pages/'
  ];
  
  let newComponents = [];
  
  componentDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true });
      files.forEach(file => {
        if ((file.endsWith('.jsx') || file.endsWith('.tsx')) && !file.includes('.test.')) {
          try {
            const content = fs.readFileSync(path.join(dir, file), 'utf8');
            componentPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(content)) !== null) {
                const componentName = match[2] || match[1];
                
                if (componentName && !registry.components.find(c => c.name === componentName)) {
                  // Determine component type based on name and location
                  let type = 'ui';
                  if (file.includes('page') || dir.includes('pages')) type = 'page';
                  if (file.includes('layout')) type = 'layout';
                  if (file.includes('form')) type = 'form';
                  if (file.includes('chart') || file.includes('graph')) type = 'chart';
                  if (file.includes('modal') || file.includes('dialog')) type = 'modal';
                  
                  newComponents.push({
                    name: componentName,
                    type: type,
                    file: path.join(dir, file),
                    added: new Date().toISOString(),
                    task: task,
                    id: crypto.createHash('sha256').update(componentName).digest('hex').substring(0, 8)
                  });
                }
              }
            });
          } catch (err) {
            // Skip files that can't be read
          }
        }
      });
    }
  });
  
  if (newComponents.length > 0) {
    registry.components.push(...newComponents);
    registry.totalComponents = registry.components.length;
    registry.lastUpdated = new Date().toISOString();
    
    // Update type counts
    newComponents.forEach(component => {
      registry.byType[component.type] = (registry.byType[component.type] || 0) + 1;
    });
    
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    console.log(`✅ Added ${newComponents.length} new components`);
  }
}

/**
 * Update schemas registry by scanning TypeScript interfaces and database schemas
 */
function updateSchemasRegistry() {
  const registryPath = 'registry/schemas.json';
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  
  const schemaPatterns = [
    /interface\s+([A-Z][a-zA-Z0-9]+)/g,
    /type\s+([A-Z][a-zA-Z0-9]+)\s*=/g,
    /CREATE\s+TABLE\s+([a-z_]+)/gi
  ];
  
  const schemaDirs = [
    'src/types/',
    'types/',
    'src/schemas/',
    'schemas/',
    'src/models/',
    'models/',
    'sql/',
    'migrations/'
  ];
  
  let newSchemas = [];
  
  schemaDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true });
      files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.sql') || file.endsWith('.json')) {
          try {
            const content = fs.readFileSync(path.join(dir, file), 'utf8');
            schemaPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(content)) !== null) {
                const schemaName = match[1];
                
                if (schemaName && !registry.schemas.find(s => s.name === schemaName)) {
                  // Determine schema type
                  let type = 'typescript';
                  if (file.endsWith('.sql')) type = 'database';
                  if (dir.includes('api') || file.includes('api')) type = 'api';
                  if (dir.includes('validation')) type = 'validation';
                  
                  newSchemas.push({
                    name: schemaName,
                    type: type,
                    file: path.join(dir, file),
                    added: new Date().toISOString(),
                    task: task,
                    id: crypto.createHash('sha256').update(schemaName).digest('hex').substring(0, 8)
                  });
                }
              }
            });
          } catch (err) {
            // Skip files that can't be read
          }
        }
      });
    }
  });
  
  if (newSchemas.length > 0) {
    registry.schemas.push(...newSchemas);
    registry.totalSchemas = registry.schemas.length;
    registry.lastUpdated = new Date().toISOString();
    
    // Update type counts
    newSchemas.forEach(schema => {
      registry.byType[schema.type] = (registry.byType[schema.type] || 0) + 1;
    });
    
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    console.log(`✅ Added ${newSchemas.length} new schemas`);
  }
}

// Execute all registry updates
try {
  updateEndpointsRegistry();
  updateComponentsRegistry();
  updateSchemasRegistry();
  
  // Update cheatsheet with new registry data
  const { execSync } = require('child_process');
  try {
    execSync(`node .claude/scripts/update-cheatsheet.js ${task}`, { stdio: 'inherit' });
  } catch (cheatsheetError) {
    console.warn('⚠️  Cheatsheet update failed, but registry update succeeded');
  }
  
  console.log(`📊 Registry update completed for ${task}`);
} catch (error) {
  console.error('❌ Registry update failed:', error.message);
  process.exit(1);
}