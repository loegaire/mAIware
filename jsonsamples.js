const crypto = require('node:crypto');
const {
  VENDORS,
  SIGNATURES,
  FILE_TYPES,
  PACKERS,
  MALWARE_FAMILIES,
  SUSPICIOUS_APIS,
  SUSPICIOUS_STRINGS,
  BENIGN_STRINGS
} = require('./datasrcs');

/**
 * Generates fake hashes for the demo report.
 */
const getFakeHashes = (filename) => {
  const md5 = crypto.createHash('md5').update(filename + Date.now()).digest('hex');
  const sha256 = crypto.createHash('sha256').update(filename + Date.now()).digest('hex');
  return { md5, sha256 };
};

/**
 * This is our list of 20 "raw" samples.
 * They use numbers (indexes) to refer to the data sources.
 */
const rawSamples = [
  // --- 8 Benign Samples ---
  { name: "vcredist_x64.exe", c: "Benign", f: 0, v: 2, p: 0, s: 0, apis: [], strings: [0] },
  { name: "Notepad++.exe", c: "Benign", f: 0, v: 1, p: 0, s: 2, apis: [], strings: [1, 2] },
  { name: "calc.exe", c: "Benign", f: 0, v: 2, p: 0, s: 0, apis: [], strings: [3] },
  { name: "kernel32.dll", c: "Benign", f: 2, v: 2, p: 0, s: 0, apis: [], strings: [4, 5, 6] },
  { name: "chrome_installer.exe", c: "Benign", f: 0, v: 0, p: 0, s: 1, apis: [], strings: [] },
  { name: "putty.exe", c: "Benign", f: 0, v: 10, p: 0, s: 3, apis: [], strings: [7] },
  { name: "AcroRead.exe", c: "Benign", f: 0, v: 16, p: 0, s: 3, apis: [], strings: [] },
  { name: "datasheet.pdf", c: "Benign", f: 4, v: 4, p: 0, s: 3, apis: [], strings: [] },

  // --- 6 Suspicious Samples ---
  { name: "legit_tool_packed.exe", c: "Suspicious", f: 1, v: 3, p: 1, s: 4, apis: [11, 21], strings: [20, 21] },
  { name: "downloader_obf.exe", c: "Suspicious", f: 1, v: 14, p: 5, s: 4, apis: [2, 10], strings: [11, 12] },
  { name: "patcher.exe", c: "Suspicious", f: 0, v: 8, p: 0, s: 4, apis: [7, 8, 9], strings: [13, 14, 15] },
  { name: "installer.msi", c: "Suspicious", f: 3, v: 17, p: 0, s: 3, apis: [], strings: [16, 17, 18] },
  { name: "license_keygen.exe", c: "Suspicious", f: 1, v: 19, p: 2, s: 6, apis: [7, 9], strings: [13, 14] },
  { name: "setup_with_adware.exe", c: "Suspicious", f: 0, v: 11, p: 0, s: 3, apis: [12], strings: [18] },
  
  // --- 6 Malware Samples ---
  { name: "invoice_8374.exe", c: "Malware", f: 0, v: 5, p: 0, s: 4, apis: [2, 10, 3], strings: [0, 1], fam: 0 },
  { name: "svchost.exe", c: "Malware", f: 1, v: 6, p: 0, s: 4, apis: [0, 15, 1], strings: [2, 3], fam: 1 },
  { name: "document.dll", c: "Malware", f: 2, v: 7, p: 0, s: 4, apis: [4, 5, 6], strings: [4, 5, 6, 7], fam: 2 },
  { name: "update.exe", c: "Malware", f: 0, v: 9, p: 0, s: 4, apis: [13, 14, 12], strings: [8, 9, 10], fam: 3 },
  { name: "javaupdate.exe", c: "Malware", f: 1, v: 12, p: 3, s: 5, apis: [0, 1, 3, 11], strings: [2, 19, 20], fam: 4 },
  { name: "report.pdf.exe", c: "Malware", f: 0, v: 13, p: 0, s: 4, apis: [2, 10], strings: [0, 11, 12], fam: 7 }
];

/**
 * Builds a human-readable JSON report by mapping raw sample data.
 * @param {string} detectedFilename - The name of the file that was actually detected.
 * @returns {object} A final, human-readable JSON object.
 */
function getRandomDemoJson(detectedFilename) {
  // 1. Pick a random raw sample definition
  const rawSample = rawSamples[Math.floor(Math.random() * rawSamples.length)];
  
  // 2. Build the final, readable JSON object
  const finalJson = {
    "detected_filename": detectedFilename,
    "scanned_sample_name": rawSample.name,
    "file_hashes": getFakeHashes(detectedFilename),
    "classification": rawSample.c,
    "malware_family": rawSample.fam !== undefined ? MALWARE_FAMILIES[rawSample.fam] : null,
    "confidence_score": (Math.random() * (0.99 - 0.55) + 0.55).toFixed(2),
    "vendor": VENDORS[rawSample.v], // Mapping vendor from index
    "key_findings": {
      "file_type": FILE_TYPES[rawSample.f], // Mapping file type
      "packer_detected": PACKERS[rawSample.p], // Mapping packer
      "signature": SIGNATURES[rawSample.s], // Mapping signature
      
      // Map all API indexes to their string values
      "suspicious_api_imports": rawSample.apis.map(index => SUSPICIOUS_APIS[index]),
      
      // Map all string indexes to their values
      // Use the correct list (benign vs. suspicious) based on classification
      "key_strings": (rawSample.c === "Benign")
        ? rawSample.strings.map(index => BENIGN_STRINGS[index])
        : rawSample.strings.map(index => SUSPICIOUS_STRINGS[index])
    }
  };

  // Clean up empty fields for a tidier output
  if (finalJson.malware_family === null) {
    delete finalJson.malware_family;
  }
  if (finalJson.key_findings.suspicious_api_imports.length === 0) {
    delete finalJson.key_findings.suspicious_api_imports;
  }
  if (finalJson.key_findings.key_strings.length === 0) {
    delete finalJson.key_findings.key_strings;
  }
  
  return finalJson;
}

module.exports = {
  getRandomDemoJson
};
