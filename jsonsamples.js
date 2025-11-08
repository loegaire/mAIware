// A list of all 12 sample JSON objects
const allSamples = [
  // --- Benign Samples ---
  {
    "filename": "vcredist_x64.exe",
    "file_hashes": { "md5": "e2a2b724f7966814c004d4a6f2c8d233", "sha256": "f01c8303c73fbf50669e2f89d3c1624c96a84f37861ae6e1039afb07b8b8f8f0" },
    "classification": "Benign",
    "confidence_score": 0.99,
    "key_findings": {
      "file_type": "PE32+ executable (GUI) x86-64, for MS Windows",
      "packer_detected": "None",
      "signature": "Verified (Microsoft Corporation)"
    }
  },
  {
    "filename": "Notepad++.exe",
    "file_hashes": { "md5": "a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8", "sha256": "b9c8d7e6f5g4h3i2j1k0l9m8n7o6p5q4r3s2t1u0v9w8x7y6z5a4b3c2d1e0f9" },
    "classification": "Benign",
    "confidence_score": 0.97,
    "key_findings": {
      "file_type": "PE32+ executable (GUI) x86-64, for MS Windows",
      "packer_detected": "None",
      "signature": "Verified (Notepad++ team)"
    }
  },
  {
    "filename": "calc.exe",
    "file_hashes": { "md5": "112233445566778899aabbccddeeff00", "sha256": "ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100" },
    "classification": "Benign",
    "confidence_score": 1.00,
    "key_findings": { "file_type": "PE32+ executable (GUI) x86-64, for MS Windows", "signature": "Verified (Microsoft Windows)" }
  },
  {
    "filename": "kernel32.dll",
    "file_hashes": { "md5": "0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d", "sha256": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b" },
    "classification": "Benign",
    "confidence_score": 1.00,
    "key_findings": { "file_type": "PE32+ DLL (GUI) x86-64, for MS Windows", "signature": "Verified (Microsoft Windows)" }
  },
  // --- Suspicious Samples ---
  {
    "filename": "legit_tool_packed.exe",
    "file_hashes": { "md5": "4f4a4b4c4d4e4f5a5b5c5d5e5f6a6b6c", "sha256": "6a6b6c6d6e6f7a7b7c7d7e7f8a8b8c8d9e9f0a0b0c0d0e0f1a1b1c1d1e1f2a2b" },
    "classification": "Suspicious",
    "confidence_score": 0.65,
    "key_findings": {
      "file_type": "PE32 executable (GUI) Intel 80386, for MS Windows",
      "packer_detected": "UPX (Universal Packer for eXecutables)",
      "section_entropy": [
        { "name": "UPX0", "entropy": 7.98, "note": "High entropy suggests packing/encryption" }
      ],
      "suspicious_api_imports": ["VirtualAlloc", "VirtualProtect", "GetProcAddress"],
      "signature": "Not Signed"
    }
  },
  {
    "filename": "downloader_obf.exe",
    "file_hashes": { "md5": "7d7e7f8a8b8c8d9e9f0a0b0c0d1e1f2a", "sha256": "9e9f0a0b0c0d0e0f1a1b1c1d1e1f2a2b3c3d3e3f4a4b4c4d4e4f5a5b5c5d5e5f" },
    "classification": "Suspicious",
    "confidence_score": 0.80,
    "key_findings": {
      "file_type": "PE32 executable (console) Intel 80386, for MS Windows",
      "packer_detected": "Unknown (High entropy)",
      "section_entropy": [
        { "name": ".text", "entropy": 7.89, "note": "Code section is highly obfuscated or encrypted" }
      ],
      "suspicious_api_imports": ["URLDownloadToFileW", "WinExec"],
      "signature": "Not Signed"
    }
  },
  {
    "filename": "patcher.exe",
    "file_hashes": { "md5": "b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6", "sha256": "c1c2c3c4c5c6c7c8c9c0c1c2c3c4c5c6c7c8c9c0c1c2c3c4c5c6c7c8c9c0c1c2" },
    "classification": "Suspicious (Potentially Unwanted Program)",
    "confidence_score": 0.55,
    "key_findings": {
      "suspicious_api_imports": ["WriteProcessMemory", "ReadProcessMemory", "OpenProcess"],
      "suspicious_strings": ["crack", "patch", "disable_antivirus"],
      "signature": "Not Signed"
    }
  },
  {
    "filename": "installer.msi",
    "file_hashes": { "md5": "d4d5d6d7d8d9d0d1d2d3d4d5d6d7d8d9", "sha256": "e4e5e6e7e8e9e0e1e2e3e4e5e6e7e8e9e0e1e2e3e4e5e6e7e8e9e0e1e2e3e4e5" },
    "classification": "Suspicious",
    "confidence_score": 0.70,
    "key_findings": {
      "file_type": "MSI (Microsoft Installer)",
      "suspicious_strings": ["Embedded EXE", "CustomAction", "RunPowerShellScript"],
      "signature": "Verified (Unknown Publisher)"
    }
  },
  // --- Malware Samples ---
  {
    "filename": "invoice_8374.exe",
    "file_hashes": { "md5": "a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5", "sha256": "e0f1a2b3c4d5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1" },
    "classification": "Malware (Trojan.Downloader.Win32)",
    "confidence_score": 0.98,
    "key_findings": {
      "file_type": "PE32 executable (GUI) Intel 80386, for MS Windows",
      "suspicious_api_imports": ["URLDownloadToFileW", "ShellExecuteW", "Socket"],
      "suspicious_strings": ["http://bad-c2-server.com/payload.dat", "/temp/vbc.exe"],
      "signature": "Not Signed"
    }
  },
  {
    "filename": "svchost.exe",
    "file_hashes": { "md5": "5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0", "sha256": "f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2" },
    "classification": "Malware (Masquerader.Win32.Agent)",
    "confidence_score": 0.99,
    "key_findings": {
      "suspicious_api_imports": ["CreateRemoteThread", "NtInjectThread", "SetWindowsHookExW"],
      "suspicious_strings": ["keylog.txt", "steal_passwords"],
      "signature": "Not Signed",
      "note": "File name 'svchost.exe' is masquerading as a system file."
    }
  },
  {
    "filename": "document.dll",
    "file_hashes": { "md5": "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8", "sha256": "d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4" },
    "classification": "Malware (Ransomware.Win32.Locky)",
    "confidence_score": 1.00,
    "key_findings": {
      "file_type": "PE32 DLL (GUI) Intel 80386, for MS Windows",
      "suspicious_api_imports": ["CryptGenKey", "CryptEncrypt", "DeleteFileW"],
      "suspicious_strings": [".locked", "HOW_TO_DECRYPT.txt", "vssadmin.exe delete shadows"],
      "signature": "Not Signed"
    }
  },
  {
    "filename": "update.exe",
    "file_hashes": { "md5": "f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3", "sha256": "a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8" },
    "classification": "Malware (Worm.Win32.Autorun)",
    "confidence_score": 0.96,
    "key_findings": {
      "suspicious_api_imports": ["CopyFileW", "SetFileAttributesW", "RegSetValueExW"],
      "suspicious_strings": ["autorun.inf", "[autorun]", "open=update.exe"],
      "signature": "Not Signed"
    }
  }
];

// Export the list so other files can import it
module.exports = {
  allSamples
};
