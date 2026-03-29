const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read the generated build info
const buildInfoPath = path.join(__dirname, '..', 'lib', 'buildInfo.ts');
const content = fs.readFileSync(buildInfoPath, 'utf8');

// Extract buildId and changelog from the TS file
const buildIdMatch = content.match(/"buildId":\s*"([^"]+)"/);
const changelogMatch = content.match(/"changelog":\s*"([^"]*(?:\\.[^"]*)*)"/);

if (!buildIdMatch) {
  console.error('Could not extract buildId from buildInfo.ts');
  process.exit(1);
}

const buildId = buildIdMatch[1];
// Unescape the changelog JSON string
const changelog = changelogMatch ? JSON.parse(`"${changelogMatch[1]}"`) : '';

console.log(`Updating Convex with buildId: ${buildId}`);

// Call the Convex mutation to store the latest build ID
try {
  const args = JSON.stringify({ buildId, changelog });
  execSync(`npx convex run appMeta:setLatestBuildId '${args}'`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('Build ID updated in Convex successfully');
} catch (e) {
  console.error('Failed to update build ID in Convex:', e.message);
  // Don't fail the deploy for this
}
