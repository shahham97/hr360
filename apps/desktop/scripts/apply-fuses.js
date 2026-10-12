// @ts-check
const path = require('path');
const fs = require('fs');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

/**
 * Applies security fuses to packaged HR360 Electron binary
 * Disables Node CLI inspect arguments, NODE_OPTIONS, RunAsNode,
 * and forces execution only from within verified asar.
 */
async function applyFusesToExecutable(executablePath) {
  if (!fs.existsSync(executablePath)) {
    console.warn(`[Electron Fuses] Executable not found at: ${executablePath}. Skipping fuse application.`);
    return false;
  }

  console.log(`[Electron Fuses] Applying production tamper-resistance fuses to: ${executablePath}`);
  await flipFuses(executablePath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });

  console.log('✅ [Electron Fuses] Successfully applied all security fuses.');
  return true;
}

if (require.main === module) {
  const target = process.argv[2] || path.join(__dirname, '../release-builds/win-unpacked/HR360.exe');
  applyFusesToExecutable(target).catch((err) => {
    console.error('❌ [Electron Fuses Error]:', err);
    process.exit(1);
  });
}

module.exports = { applyFusesToExecutable };
