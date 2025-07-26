#!/usr/bin/env node

/**
 * Memory Update Script
 * Stores implementation decisions and learnings to Graphity Memory MCP
 * This helps maintain context across development sessions
 */

const fs = require('fs');
const path = require('path');

// Read input from stdin (piped from command)
let input = '';
process.stdin.on('data', chunk => {
  input += chunk.toString();
});

process.stdin.on('end', () => {
  updateMemory(input.trim());
});

/**
 * Update Graphity Memory with implementation details
 */
function updateMemory(memoryEntry) {
  if (!memoryEntry) {
    console.log('ℹ️  No memory entry provided');
    return;
  }
  
  console.log('🧠 Updating memory with implementation details...');
  
  // Parse the memory entry
  const lines = memoryEntry.split('\n');
  const task = lines.find(line => line.startsWith('Task:'))?.replace('Task:', '').trim();
  const status = lines.find(line => line.startsWith('Status:'))?.replace('Status:', '').trim();
  const implementation = lines.find(line => line.startsWith('Implementation:'))?.replace('Implementation:', '').trim();
  
  // Create structured memory entry
  const memoryData = {
    timestamp: new Date().toISOString(),
    task: task || 'unknown',
    status: status || 'unknown',
    implementation: implementation || 'unknown',
    context: extractImplementationContext(task),
    learnings: extractLearnings(task),
    decisions: extractDecisions(task)
  };
  
  // Store locally until Graphity MCP is available
  storeLocalMemory(memoryData);
  
  // TODO: When Graphity MCP is available, use:
  // await graphityMCP.store(memoryData);
  
  console.log(`✅ Memory updated for task: ${task}`);
}

/**
 * Extract implementation context from recent changes
 */
function extractImplementationContext(task) {
  if (!task) return {};
  
  const context = {
    filesModified: [],
    componentsCreated: [],
    endpointsAdded: [],
    testsWritten: false,
    performanceOptimized: false
  };
  
  try {
    // Check registry for what was added
    const endpointsRegistry = JSON.parse(fs.readFileSync('registry/endpoints.json', 'utf8'));
    const componentsRegistry = JSON.parse(fs.readFileSync('registry/components.json', 'utf8'));
    
    context.endpointsAdded = endpointsRegistry.endpoints
      .filter(e => e.task === task)
      .map(e => `${e.method} ${e.path}`);
    
    context.componentsCreated = componentsRegistry.components
      .filter(c => c.task === task)
      .map(c => c.name);
    
    // Check if tests were run
    const testLogPath = `.claude/logs/test_results_${task}.log`;
    if (fs.existsSync(testLogPath)) {
      const testLog = fs.readFileSync(testLogPath, 'utf8');
      context.testsWritten = testLog.includes('✅ Tests passed!');
    }
    
  } catch (err) {
    // Context extraction failed, use defaults
  }
  
  return context;
}

/**
 * Extract learnings from the implementation process
 */
function extractLearnings(task) {
  const learnings = [];
  
  try {
    // Check for test failures that led to learnings
    const testLogPath = `.claude/logs/test_results_${task}.log`;
    if (fs.existsSync(testLogPath)) {
      const testLog = fs.readFileSync(testLogPath, 'utf8');
      
      if (testLog.includes('performance')) {
        learnings.push('Performance optimization was required for this task');
      }
      
      if (testLog.includes('security')) {
        learnings.push('Security considerations were important for this implementation');
      }
      
      if (testLog.includes('accessibility')) {
        learnings.push('Accessibility requirements affected component design');
      }
    }
    
    // Check failure count to understand complexity
    const failureCountPath = `.claude/state/failure_count_${task}.txt`;
    if (fs.existsSync(failureCountPath)) {
      const failureCount = parseInt(fs.readFileSync(failureCountPath, 'utf8').trim());
      if (failureCount > 2) {
        learnings.push(`Task required ${failureCount} attempts - complexity was higher than expected`);
      }
    }
    
  } catch (err) {
    // Learning extraction failed
  }
  
  return learnings;
}

/**
 * Extract architectural decisions made during implementation
 */
function extractDecisions(task) {
  const decisions = [];
  
  try {
    // Analyze the task specification for architectural decisions
    const specPath = `specs/features/${task}.md`;
    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf8');
      
      if (specContent.includes('WebSocket')) {
        decisions.push('Chose WebSocket for real-time communication over Server-Sent Events');
      }
      
      if (specContent.includes('Redis')) {
        decisions.push('Used Redis for caching to meet performance requirements');
      }
      
      if (specContent.includes('PostgreSQL')) {
        decisions.push('Chose PostgreSQL for data persistence with ACID compliance');
      }
      
      if (specContent.includes('TypeScript')) {
        decisions.push('Implemented with TypeScript for type safety and developer experience');
      }
    }
    
    // Check git commits for architectural decisions
    try {
      const { execSync } = require('child_process');
      const recentCommits = execSync(`git log --oneline -5 --grep="${task}"`, { encoding: 'utf8' });
      
      if (recentCommits.includes('refactor')) {
        decisions.push('Refactored code structure for better maintainability');
      }
      
      if (recentCommits.includes('optimize')) {
        decisions.push('Optimized implementation for performance requirements');
      }
      
    } catch (err) {
      // Git log extraction failed
    }
    
  } catch (err) {
    // Decision extraction failed
  }
  
  return decisions;
}

/**
 * Store memory locally until Graphity MCP is available
 */
function storeLocalMemory(memoryData) {
  const memoryDir = '.claude/memory';
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  
  const memoryFile = path.join(memoryDir, `${memoryData.task}.json`);
  
  // Append to existing memory or create new
  let existingMemory = [];
  if (fs.existsSync(memoryFile)) {
    try {
      existingMemory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
    } catch (err) {
      existingMemory = [];
    }
  }
  
  existingMemory.push(memoryData);
  
  fs.writeFileSync(memoryFile, JSON.stringify(existingMemory, null, 2));
  
  // Also update global memory index
  const memoryIndex = path.join(memoryDir, 'index.json');
  let index = { entries: [], lastUpdated: new Date().toISOString() };
  
  if (fs.existsSync(memoryIndex)) {
    try {
      index = JSON.parse(fs.readFileSync(memoryIndex, 'utf8'));
    } catch (err) {
      // Use default index
    }
  }
  
  // Update or add entry in index
  const existingEntry = index.entries.find(e => e.task === memoryData.task);
  if (existingEntry) {
    existingEntry.lastUpdated = memoryData.timestamp;
    existingEntry.status = memoryData.status;
  } else {
    index.entries.push({
      task: memoryData.task,
      firstEntry: memoryData.timestamp,
      lastUpdated: memoryData.timestamp,
      status: memoryData.status,
      entriesCount: 1
    });
  }
  
  index.lastUpdated = new Date().toISOString();
  fs.writeFileSync(memoryIndex, JSON.stringify(index, null, 2));
  
  console.log(`💾 Memory stored locally: ${memoryFile}`);
}

// If no stdin input, show usage
if (process.stdin.isTTY) {
  console.log('Usage: echo "memory entry" | node update-memory.js');
  console.log('Example: echo "Task: TASK-001\\nStatus: Completed\\nImplementation: Success" | node update-memory.js');
}