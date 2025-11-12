const crypto = require('node:crypto');
const {
  VENDORS,
  SIGNATURES,
  FILE_TYPES,
  PACKERS,
  MALWARE_FAMILIES,
  API_SETS, 
  SUSPICIOUS_STRINGS,
  BENIGN_STRINGS,
  CLASSIFICATION,
  ENTROPY_SECTIONS
} = require('./datasrcs');

// Generates fake hashes for the demo report.
const getFakeHashes = (filename) => {
  const md5 = crypto.createHash('md5').update(filename + Date.now()).digest('hex');
  const sha256 = crypto.createHash('sha256').update(filename + Date.now()).digest('hex');
  return { md5, sha256 };
};

  // This is our list of 20 "raw" samples.
const rawSamples = [
  // --- 8 Benign Samples (c: 0) ---
  { name: "vcredist_x64.exe", c: 0, f: 0, v: 2, p: 0, s: 0, apiSet: 1, strings: [0], e: [{s:0, v:6.51}, {s:1, v:2.12}, {s:2, v:5.89}] },
  { name: "Notepad++.exe", c: 0, f: 0, v: 1, p: 0, s: 2, apiSet: 0, strings: [1, 2], e: [{s:0, v:6.82}, {s:1, v:4.15}, {s:2, v:5.11}] },
  { name: "calc.exe", c: 0, f: 0, v: 2, p: 0, s: 0, apiSet: 1, strings: [3], e: [{s:0, v:6.01}, {s:1, v:1.99}, {s:2, v:3.44}] },
  { name: "kernel32.dll", c: 0, f: 2, v: 2, p: 0, s: 0, apiSet: 0, strings: [4, 5, 6], e: [{s:0, v:6.19}, {s:1, v:2.78}] },
  { name: "chrome_installer.exe", c: 0, f: 0, v: 0, p: 0, s: 1, apiSet: 2, strings: [], e: [{s:0, v:6.7}, {s:1, v:3.5}, {s:2, v:4.9}] },
  { name: "putty.exe", c: 0, f: 0, v: 10, p: 0, s: 3, apiSet: 2, strings: [7], e: [{s:0, v:6.2}, {s:1, v:2.1}] },
  { name: "AcroRead.exe", c: 0, f: 0, v: 16, p: 0, s: 3, apiSet: 0, strings: [], e: [{s:0, v:6.5}, {s:1, v:4.5}, {s:2, v:5.5}] },
  { name: "datasheet.pdf", c: 0, f: 4, v: 4, p: 0, s: 3, apiSet: 0, strings: [], e: [] }, // No entropy for non-PE

  // --- 6 Suspicious Samples (c: 1) ---
  { name: "legit_tool_packed.exe", c: 1, f: 1, v: 3, p: 1, s: 4, apiSet: 3, strings: [20, 21], e: [{s:3, v:7.98}, {s:4, v:7.95}] },
  { name: "downloader_obf.exe", c: 1, f: 1, v: 14, p: 5, s: 4, apiSet: 5, strings: [11, 12], e: [{s:0, v:7.89}, {s:1, v:2.0}] },
  { name: "patcher.exe", c: 1, f: 0, v: 8, p: 0, s: 4, apiSet: 4, strings: [13, 14, 15], e: [{s:0, v:6.4}, {s:1, v:5.1}, {s:5, v:7.2}] },
  { name: "installer.msi", c: 1, f: 3, v: 17, p: 0, s: 3, apiSet: 6, strings: [16, 17, 18], e: [] },
  { name: "license_keygen.exe", c: 1, f: 1, v: 19, p: 2, s: 6, apiSet: 4, strings: [13, 14], e: [{s:0, v:7.6}, {s:1, v:7.5}] },
  { name: "setup_with_adware.exe", c: 1, f: 0, v: 11, p: 0, s: 3, apiSet: 6, strings: [18], e: [{s:0, v:6.3}, {s:2, v:5.8}] },
  
  // --- 6 Malware Samples (c: 2) ---
  { name: "invoice_8374.exe", c: 2, f: 0, v: 5, p: 0, s: 4, apiSet: 5, strings: [0, 1], fam: 0, e: [{s:0, v:6.95}, {s:1, v:7.1}] },
  { name: "svchost.exe", c: 2, f: 1, v: 6, p: 0, s: 4, apiSet: 7, strings: [2, 3], fam: 1, e: [{s:0, v:6.88}, {s:1, v:4.0}] },
  { name: "document.dll", c: 2, f: 2, v: 7, p: 0, s: 4, apiSet: 8, strings: [4, 5, 6, 7], fam: 2, e: [{s:0, v:7.01}, {s:2, v:5.1}] },
  { name: "update.exe", c: 2, f: 0, v: 9, p: 0, s: 4, apiSet: 6, strings: [8, 9, 10], fam: 3, e: [{s:0, v:6.75}, {s:1, v:3.1}] },
  { name: "javaupdate.exe", c: 2, f: 1, v: 12, p: 3, s: 5, apiSet: 9, strings: [2, 19, 20], fam: 4, e: [{s:0, v:7.5}, {s:1, v:7.4}] },
  { name: "report.pdf.exe", c: 2, f: 0, v: 13, p: 0, s: 4, apiSet: 10, strings: [0, 11, 12], fam: 7, e: [{s:0, v:6.8}, {s:1, v:7.2}] }
];

// --- generateGraphData() function has been REMOVED from this file ---

/**
 * Builds a human-readable JSON report by mapping raw sample data.
 * @param {string} detectedFilename - The name of the file that was actually detected.
 * @returns {object} A final, human-readable JSON object.
 */
function getRandomDemoJson(detectedFilename, fileHashes) {
  // 1. Pick a random raw sample definition
  const rawSample = rawSamples[Math.floor(Math.random() * rawSamples.length)];
  const classification = CLASSIFICATION[rawSample.c];
  
  // 2. Map API index to the actual list of names
  // Use empty array as default if index is bad
  const apiImports = API_SETS[rawSample.apiSet] || [];

  // 3. Build the final, readable JSON object
  const hashValues =
    fileHashes && fileHashes.sha256 && fileHashes.md5
      ? fileHashes
      : getFakeHashes(detectedFilename);

  const finalJson = {
    "detected_filename": detectedFilename,
    "file_hashes": hashValues,
    "classification": classification,
    "malware_family": rawSample.fam !== undefined ? MALWARE_FAMILIES[rawSample.fam] : null,
    "confidence_score": (Math.random() * (0.99 - 0.55) + 0.55).toFixed(2),
    "vendor": VENDORS[rawSample.v], // This is now an object {name, icon}
    "key_findings": {
      "file_type": FILE_TYPES[rawSample.f], 
      "packer_detected": PACKERS[rawSample.p], 
      "signature": SIGNATURES[rawSample.s], // This is now an object {name, icon, level}
      "section_entropy": rawSample.e.map(entry => ({
        name: ENTROPY_SECTIONS[entry.s],
        entropy: entry.v
      })),
      "api_imports": apiImports, // <-- RENAMED and simplified
      "key_strings": (rawSample.c === 0) 
        ? rawSample.strings.map(index => BENIGN_STRINGS[index]) 
        : rawSample.strings.map(index => SUSPICIOUS_STRINGS[index]) 
    }
    // 4. "graphData" key is GONE.
  };

  // Clean up empty fields for a tidier output
  if (finalJson.malware_family === null) {
    delete finalJson.malware_family;
  }
  if (finalJson.key_findings.api_imports.length === 0) {
    delete finalJson.key_findings.api_imports;
  }
  if (finalJson.key_findings.key_strings.length === 0) {
    delete finalJson.key_findings.key_strings;
  }
  
  return finalJson;
}

module.exports = {
  getRandomDemoJson
};
