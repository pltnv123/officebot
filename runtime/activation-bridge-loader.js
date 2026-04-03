const fs = require('fs');
const path = require('path');

const bridgePath = path.join(__dirname, 'activation-bridge.json');

function loadBridge() {
  const payload = fs.readFileSync(bridgePath, 'utf8');
  try {
    const data = JSON.parse(payload);
    const validRoles = new Set([
      'technical-director',
      'release-manager',
      'qa-lead',
      'devops-engineer',
      'lead-programmer',
    ]);
    data.mappedRoles = data.mappedRoles.filter(role => validRoles.has(role));
    return data;
  } catch (err) {
    throw new Error(`Failed to parse activation bridge: ${err.message}`);
  }
}

module.exports = { loadBridge };
