const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read the generated build info
const buildInfoPath = path.join(__dirname, '..', 'lib', 'buildInfo.ts');
const content = fs.readFileSync(buildInfoPath, 'utf8');

const buildIdMatch = content.match(/"buildId":\s*"([^"]+)"/);
if (!buildIdMatch) {
  console.error('Could not extract buildId from buildInfo.ts');
  process.exit(1);
}

const buildId = buildIdMatch[1];
console.log(`Updating Convex with buildId: ${buildId}`);

try {
  execSync(`npx convex run appMeta:setLatestBuildId '{"buildId":"${buildId}"}'`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('Build ID updated in Convex successfully');
} catch (e) {
  console.error('Failed to update build ID in Convex:', e.message);
}
