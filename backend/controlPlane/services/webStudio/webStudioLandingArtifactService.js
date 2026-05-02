/**
 * WebStudio Landing Artifact Service
 * 
 * Provides versioning, preview, and lifecycle management for landing_page artifacts.
 * Follows universal artifact lifecycle: edit → preview → QA → version → restore → delivery
 */

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');

function nowIso() {
  return new Date().toISOString();
}

async function validateArtifactRoot({ artifact, rootDir }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const realRoot = path.resolve(String(rootDir || process.cwd()));
  if (!artifactRoot.startsWith(realRoot)) {
    throw new Error('artifact_root_outside_workspace');
  }
  await fsPromises.access(artifactRoot);
  return artifactRoot;
}

async function ensureGeneratedVersion({ artifact, rootDir }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const v0001File = path.join(versionsDir, 'v0001', 'index.html');
  const v0001MetaFile = path.join(versionsDir, 'v0001.json');
  const projectType = artifact.project_type || 'landing_page';
  const primaryFileName = projectType === 'landing_page' ? 'index.html' : 'script.py';
  const indexPath = path.join(artifactRoot, primaryFileName);
  
  // Check if v0001 already exists
  try {
    await fsPromises.access(v0001File);
    return { ok: true, version_id: 'v0001', exists: true };
  } catch {}
  
  // Create versions directory
  await fsPromises.mkdir(versionsDir, { recursive: true });
  
  // Read current index.html as generated version
  let generatedSource;
  try {
    generatedSource = await fsPromises.readFile(indexPath, 'utf8');
  } catch (err) {
    return { ok: false, error: 'primary_file_not_found' };
  }
  
  // Save v0001
  await fsPromises.mkdir(path.join(versionsDir, 'v0001'), { recursive: true });
  await fsPromises.writeFile(v0001File, generatedSource, 'utf8');
  await fsPromises.writeFile(v0001MetaFile, JSON.stringify({
    version_id: 'v0001',
    label: 'Generated version',
    source_type: 'generated',
    created_at: nowIso(),
    source_length: generatedSource.length,
  }, null, 2), 'utf8');
  
  return { ok: true, version_id: 'v0001', exists: false, created: true };
}

async function listVersions({ artifact }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  
  try {
    const files = await fsPromises.readdir(versionsDir).catch(() => []);
    const versions = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const metadataPath = path.join(versionsDir, file);
        const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
        versions.push({
          version_id: metadata.version_id || file.replace('.json', ''),
          run_id: metadata.run_id || null,
          label: metadata.label || metadata.version_id || file.replace('.json', ''),
          source_type: metadata.source_type || 'unknown',
          saved_at: metadata.saved_at || metadata.created_at,
          version_dir: file.replace('.json', ''),
        });
      }
    }
    
    // If no versions found, ensure v0001 exists
    if (versions.length === 0) {
      const ensureResult = await ensureGeneratedVersion({ artifact, rootDir: process.cwd() });
      if (ensureResult.ok) {
        // Re-read versions after ensuring v0001
        const filesAfter = await fsPromises.readdir(versionsDir).catch(() => []);
        for (const file of filesAfter) {
          if (file.endsWith('.json')) {
            const metadataPath = path.join(versionsDir, file);
            const metadata = JSON.parse(await fsPromises.readFile(metadataPath, 'utf8'));
            versions.push({
              version_id: metadata.version_id || file.replace('.json', ''),
              run_id: metadata.run_id || null,
              label: metadata.label || metadata.version_id || file.replace('.json', ''),
              source_type: metadata.source_type || 'unknown',
              saved_at: metadata.saved_at || metadata.created_at,
              version_dir: file.replace('.json', ''),
            });
          }
        }
      }
    }
    
    // Sort by version_id ascending (v0001 first)
    versions.sort((a, b) => a.version_id.localeCompare(b.version_id));
    
    return { ok: true, versions, current_version_id: getCurrentVersionId(artifactRoot) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function getCurrentVersionId(artifactRoot) {
  const currentVersionIndexPath = path.join(artifactRoot, 'current_version.json');
  try {
    const current = JSON.parse(fs.readFileSync(currentVersionIndexPath, 'utf8'));
    return current.current_version_id || 'v0001';
  } catch {
    return 'v0001';
  }
}

async function loadVersion({ artifact, versionId }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const versionDir = path.join(versionsDir, versionId);
  const indexPath = path.join(versionDir, 'index.html');
  
  // Validate versionId format
  if (!/^v\d{4}$/.test(versionId)) {
    return null;
  }
  
  // Read version source
  try {
    const source = await fsPromises.readFile(indexPath, 'utf8');
    return source;
  } catch (err) {
    return null;
  }
}

async function saveNewVersion({ artifact, editedSource, versionLabel }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const indexPath = path.join(artifactRoot, 'index.html');
  
  // Create versions directory if it doesn't exist
  await fsPromises.mkdir(versionsDir, { recursive: true });
  
  // Find next version number
  const files = await fsPromises.readdir(versionsDir).catch(() => []);
  const versionNumbers = files
    .filter(f => /^v\d{4}\.json$/.test(f))
    .map(f => parseInt(f.slice(1, 5), 10))
    .filter(n => !isNaN(n));
  const nextVersionNum = (versionNumbers.length > 0 ? Math.max(...versionNumbers) : 0) + 1;
  const versionId = `v${String(nextVersionNum).padStart(4, '0')}`;
  
  // Save version
  const versionDir = path.join(versionsDir, versionId);
  const versionFile = path.join(versionDir, 'index.html');
  const metadataFile = path.join(versionsDir, `${versionId}.json`);
  
  await fsPromises.mkdir(versionDir, { recursive: true });
  await fsPromises.writeFile(versionFile, editedSource, 'utf8');
  await fsPromises.writeFile(metadataFile, JSON.stringify({
    version_id: versionId,
    label: versionLabel || `Edited version ${nextVersionNum}`,
    source_type: 'operator_edit',
    created_at: nowIso(),
    source_length: editedSource.length,
  }, null, 2), 'utf8');
  
  // Update current version
  await fsPromises.writeFile(path.join(artifactRoot, 'current_version.json'), JSON.stringify({
    current_version_id: versionId,
    updated_at: nowIso(),
  }, null, 2), 'utf8');
  
  // Update current index.html
  await fsPromises.writeFile(indexPath, editedSource, 'utf8');
  
  return { ok: true, version_id: versionId, saved: true };
}

async function restoreVersion({ artifact, versionId }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const versionsDir = path.join(artifactRoot, 'versions');
  const versionDir = path.join(versionsDir, versionId);
  const indexPath = path.join(artifactRoot, 'index.html');
  
  // Validate versionId format
  if (!/^v\d{4}$/.test(versionId)) {
    return { ok: false, error: 'invalid_version_id_format' };
  }
  
  // Read version source
  let versionSource;
  try {
    versionSource = await fsPromises.readFile(path.join(versionDir, 'index.html'), 'utf8');
  } catch (err) {
    return { ok: false, error: 'version_not_found' };
  }
  
  // Restore to index.html
  await fsPromises.writeFile(indexPath, versionSource, 'utf8');
  
  // Update current_version_id
  await fsPromises.writeFile(path.join(artifactRoot, 'current_version.json'), JSON.stringify({
    current_version_id: versionId,
    updated_at: nowIso(),
  }, null, 2), 'utf8');
  
  return { ok: true, restored_version_id: versionId };
}

async function getCurrentVersion({ artifact }) {
  const artifactRoot = path.resolve(String(artifact.artifact_root || ''));
  const indexPath = path.join(artifactRoot, 'index.html');
  
  try {
    const source = await fsPromises.readFile(indexPath, 'utf8');
    const currentVersionId = getCurrentVersionId(artifactRoot);
    return { ok: true, source, current_version_id: currentVersionId };
  } catch (err) {
    return { ok: false, error: 'current_version_not_found' };
  }
}

async function runLandingPreview({ artifact, editedSource, saveEdited }) {
  const artifactRoot = await validateArtifactRoot({ artifact, rootDir: process.cwd() });
  const indexPath = path.join(artifactRoot, 'index.html');
  const startTime = Date.now();
  
  let sourceToPreview = editedSource;
  let sourceMode = 'edited_unsaved';
  
  if (!editedSource) {
    // Use current index.html
    sourceToPreview = await fsPromises.readFile(indexPath, 'utf8');
    sourceMode = 'generated';
  }
  
  // Validate HTML safety
  const validationError = validateLandingHtml(sourceToPreview);
  if (validationError) {
    return { ok: false, error: 'html_validation_failed', reason: validationError };
  }
  
  // If saveEdited=true, save as new version
  if (saveEdited && editedSource) {
    await saveNewVersion({ artifact, editedSource });
    sourceMode = 'saved_edited';
  }
  
  const durationMs = Date.now() - startTime;
  const currentVersionId = getCurrentVersionId(artifactRoot);
  
  return {
    ok: true,
    project_type: 'landing_page',
    run_type: 'landing_preview_check',
    preview_route: `/api/webstudio-landing-artifact/${artifact.order_id}/index.html`,
    duration_ms: durationMs,
    source_mode: sourceMode,
    version_id: currentVersionId,
    qa_summary: {
      html_valid: true,
      static_content_only: true,
      no_external_scripts: true,
    },
  };
}

function validateLandingHtml(source) {
  // Block dangerous patterns
  const dangerousPatterns = [
    /<script/i, // script tags
    /<script\s+src\s*=\s*["']http/i, // external scripts
    /javascript:/i, // javascript URLs
    /onclick\s*=/i, // inline event handlers
    /onload\s*=/i,
    /onerror\s*=/i,
    /<iframe\s+src\s*=\s*["']http/i, // external iframes
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(source)) {
      return 'unsafe_html_pattern';
    }
  }
  
  return null;
}

module.exports = {
  runLandingPreview,
  validateArtifactRoot,
  ensureGeneratedVersion,
  listVersions,
  loadVersion,
  saveNewVersion,
  restoreVersion,
  getCurrentVersion,
  validateLandingHtml,
};
