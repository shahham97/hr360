const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const distDir = path.resolve(__dirname, '../release-builds/package-dist');
const exeSrc = path.resolve(__dirname, '../release-builds/HR360-Setup-1.0.0.exe');
const zipOut = path.resolve(__dirname, '../release-builds/HR360-Setup-1.0.0.zip');

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy executable
fs.copyFileSync(exeSrc, path.join(distDir, 'HR360-Setup-1.0.0.exe'));

// Readme
fs.writeFileSync(path.join(distDir, 'README.txt'), `================================================================================
HR360 Enterprise Client - Workstation Package
Version: 1.0.0 (Windows x64)
================================================================================

OVERVIEW
HR360 is a standalone enterprise desktop management console designed for automated
workstation attendance integration, employee master record management, and payroll
processing.

SYSTEM REQUIREMENTS
- Operating System: Windows 10 (64-bit) or Windows 11 (64-bit)
- Memory: Minimum 4 GB RAM (8 GB recommended)
- Storage: 300 MB free disk space for installation

INSTALLATION INSTRUCTIONS
1. Double-click HR360-Setup-1.0.0.exe to launch the installer.
2. If Windows SmartScreen displays a verification notice, click:
   'More info' -> 'Run anyway' to complete the workstation setup.
3. Follow the on-screen prompts to choose the installation directory.
4. Launch HR360 from the desktop shortcut or Start Menu.

INTEGRITY VERIFICATION
Verify your installer against CHECKSUM.txt using PowerShell:
Get-FileHash HR360-Setup-1.0.0.exe -Algorithm SHA256

SUPPORT & UPDATES
Installed applications automatically check for software updates upon launch.
For technical support or deployment assistance, contact your organization administrator.
`, 'utf8');

// License
fs.writeFileSync(path.join(distDir, 'LICENSE.txt'), `SOFTWARE LICENSE AGREEMENT
================================================================================
This software is provided for authorized organizational personnel management.
Unauthorized reverse engineering, redistribution, or modification is prohibited.
Refer to your organization subscription agreement for full operational terms.
`, 'utf8');

// Copyright
fs.writeFileSync(path.join(distDir, 'COPYRIGHT.txt'), `COPYRIGHT NOTICE
================================================================================
Copyright (c) 2026 HR360. All rights reserved.
All trademarks, service marks, and logos belong to their respective owners.
`, 'utf8');

// Third party notices
fs.writeFileSync(path.join(distDir, 'THIRD-PARTY-NOTICES.txt'), `THIRD-PARTY NOTICES
================================================================================
This application includes open-source software libraries under the following licenses:
- Chromium / Electron: BSD 3-Clause License
- React / React DOM: MIT License
- Tailwind CSS: MIT License
- Lucide Icons: ISC License
- jsPDF: MIT License
- PapaParse: MIT License
- Bytenode: MIT License
`, 'utf8');

// Privacy
fs.writeFileSync(path.join(distDir, 'PRIVACY.txt'), `PRIVACY POLICY
================================================================================
HR360 stores and processes employee records, attendance logs, and compensation data
solely under organizational authorization. Workstation clients communicate only
via encrypted HTTPS channels. No employee data is transmitted to unauthorized parties.
`, 'utf8');

// Checksum
const exeBuffer = fs.readFileSync(exeSrc);
const hash = crypto.createHash('sha256').update(exeBuffer).digest('hex').toUpperCase();
fs.writeFileSync(path.join(distDir, 'CHECKSUM.txt'), `${hash}  HR360-Setup-1.0.0.exe\n`, 'utf8');

console.log('Dist directory populated. Computed SHA256:', hash);

// Use PowerShell Compress-Archive
if (fs.existsSync(zipOut)) {
  fs.unlinkSync(zipOut);
}

execSync(`powershell -Command "Compress-Archive -Path '${distDir}/*' -DestinationPath '${zipOut}' -CompressionLevel Optimal"`);
const stat = fs.statSync(zipOut);
console.log(`Successfully created zip: ${zipOut}`);
console.log(`Zip Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB (${stat.size} bytes)`);
