const fs = require('fs');
const path = require('path');

// Compile or read the MonarchInfrastructureStack definition
function generateTemplate() {
  const envName = process.env.ENVIRONMENT || 'dev';
  
  // Register ts-node or load compiled / raw TS
  try {
    require('ts-node/register');
  } catch (e) {
    // If ts-node is not installed globally, transpile with @babel/core
  }

  let MonarchInfrastructureStack;
  try {
    const mod = require('../backend/infrastructure/cdk-stack.ts');
    MonarchInfrastructureStack = mod.MonarchInfrastructureStack;
  } catch (err) {
    // Fallback using babel
    const babel = require('@babel/core');
    const tsCode = fs.readFileSync(path.resolve(__dirname, '../backend/infrastructure/cdk-stack.ts'), 'utf8');
    const jsCode = babel.transformSync(tsCode, {
      presets: ['@babel/preset-typescript'],
      filename: 'cdk-stack.ts'
    }).code;
    const m = { exports: {} };
    const fn = new Function('module', 'exports', jsCode);
    fn(m, m.exports);
    MonarchInfrastructureStack = m.exports.MonarchInfrastructureStack;
  }

  const stack = new MonarchInfrastructureStack({ environmentName: envName });
  const template = stack.getTemplate();
  const outputPath = path.resolve(__dirname, '../backend/infrastructure/template.json');

  fs.writeFileSync(outputPath, JSON.stringify(template, null, 2), 'utf8');
  console.log(`[CloudFormation] Template successfully written to ${outputPath}`);
  console.log(`[CloudFormation] Target Environment: ${envName}`);
  console.log(`[CloudFormation] Includes: Cognito Identity Pool, DynamoDB Table, S3 Evidence Bucket, AppSync API, and IAM Roles.`);
}

generateTemplate();
