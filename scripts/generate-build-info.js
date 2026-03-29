const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const hash = execSync('git rev-parse --short HEAD').toString().trim();
const now = new Date();
const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
const buildNumber = Math.floor(now.getTime() / 1000).toString(36); // compact sortable id

// Get recent commit messages for changelog (last 10 commits)
let changelog = '';
try {
  changelog = execSync('git log --oneline -10 --pretty=format:"%h %s"').toString().trim();
} catch (e) {
  changelog = 'No changelog available';
}

const info = {
  commitHash: hash,
  buildTime: timestamp,
  buildId: `${hash}-${buildNumber}`,
  changelog: changelog,
};

const outPath = path.join(__dirname, '..', 'lib', 'buildInfo.ts');
const content = `// Auto-generated at build time — do not edit
export const BUILD_INFO = ${JSON.stringify(info, null, 2)} as const;
`;

fs.writeFileSync(outPath, content);
console.log(`Build info generated: ${info.buildId}`);
