// This file acts as our "database" of mappings, just as you requested.

// 1. VENDORS 
const VENDORS = [
  { name: 'Google', icon: 'fab fa-google' }, // 0
  { name: 'VirusTotal', icon: 'fas fa-shield-virus' }, // 1
  { name: 'Microsoft', icon: 'fab fa-windows' }, // 2
  { name: 'CrowdStrike', icon: 'fas fa-crow' }, // 3
  { name: 'SentinelOne', icon: 'fas fa-satellite-dish' }, // 4
  { name: 'Palo Alto Networks', icon: 'fas fa-fire-wall' }, // 5
  { name: 'McAfee', icon: 'fas fa-shield-alt' }, // 6
  { name: 'Symantec (Broadcom)', icon: 'fas fa-shield-alt' }, // 7
  { name: 'Kaspersky', icon: 'fas fa-shield-alt' }, // 8
  { name: 'ESET', icon: 'fas fa-shield-alt' }, // 9
  { name: 'Malwarebytes', icon: 'fas fa-shield-alt' }, // 10
  { name: 'Sophos', icon: 'fas fa-shield-alt' }, // 11
  { name: 'Trend Micro', icon: 'fas fa-shield-alt' }, // 12
  { name: 'FireEye (Trellix)', icon: 'fas fa-fire' }, // 13
  { name: 'Zscaler', icon: 'fas fa-cloud' }, // 14
  { name: 'Cisco Talos', icon: 'fas fa-shield-alt' }, // 15
  { name: 'Avast', icon: 'fas fa-shield-alt' }, // 16
  { name: 'Bitdefender', icon: 'fas fa-shield-alt' }, // 17
  { name: 'Fortinet', icon: 'fas fa-fort-awesome' }, // 18
  { name: 'Check Point', icon: 'fas fa-shield-alt' } // 19
];

// 2. DIGITAL SIGNATURES 
const SIGNATURES = [
  // name, icon, level
  { name: 'Verified (Microsoft Corporation)', icon: 'fas fa-check-shield', level: 'verified' }, // 0
  { name: 'Verified (Google LLC)', icon: 'fas fa-check-shield', level: 'verified' }, // 1
  { name: 'Verified (Notepad++ team)', icon: 'fas fa-check-shield', level: 'verified' }, // 2
  { name: 'Verified (Unknown Publisher)', icon: 'fas fa-exclamation-triangle', level: 'unknown' }, // 3
  { name: 'Not Signed', icon: 'fas fa-times-circle', level: 'untrusted' }, // 4
  { name: 'Expired Certificate', icon: 'fas fa-exclamation-triangle', level: 'untrusted' }, // 5
  { name: 'Self-Signed (Untrusted)', icon: 'fas fa-times-circle', level: 'untrusted' } // 6
];

// 3. FILE TYPES 
const FILE_TYPES = [
  'PE32+ (GUI) x86-64', 'PE32 (Console) Intel 80386', 'PE32+ DLL x86-64',
  'MSI Installer', 'PDF Document', 'ELF 64-bit LSB executable', 'Mach-O 64-bit executable x86_64'
];

// 4. PACKERS / OBFUSCATORS
const PACKERS = [
  'None', 'UPX', 'VMProtect', 'Themida', 'ASPack', 'Unknown (High Entropy)'
];

// 5. MALWARE FAMILIES
const MALWARE_FAMILIES = [
  'Trojan.Downloader.Win32', 'Masquerader.Win32.Agent', 'Ransomware.Win32.Locky',
  'Worm.Win32.Autorun', 'Spyware.Win32.Keylogger', 'Backdoor.Win32.Gh0st',
  'PUA.Win32.Adware', 'Dropper.Win32.Emotet'
];

// 6.API SETS
const API_SETS = [
    // Benign Sets
    ['ReadFile', 'WriteFile', 'CloseHandle'], // 0
    ['CreateFileW', 'HeapAlloc', 'HeapFree'], // 1
    ['Socket', 'Connect', 'Send', 'Recv'], // 2

    // Suspicious Sets
    ['SetWindowsHookExW', 'GetMessageW'], // 3
    ['WriteProcessMemory', 'ReadProcessMemory', 'OpenProcess'], // 4
    ['URLDownloadToFileW', 'WinExec'], // 5
    ['RegSetValueExW', 'CopyFileW', 'SetFileAttributesW'], // 6
    
    // Malware Sets
    ['CreateRemoteThread', 'VirtualAllocEx', 'WriteProcessMemory'], // 7
    ['CryptGenKey', 'CryptEncrypt', 'DeleteFileW'], // 8
    ['NtInjectThread', 'OpenProcess', 'VirtualAllocEx'], // 9
    ['Socket', 'URLDownloadToFileW', 'CreateRemoteThread', 'WinExec'] // 10
];

// 7. SUSPICIOUS STRINGS 
const SUSPICIOUS_STRINGS = [
  'http://bad-c2-server.com/payload.dat', '/temp/vbc.exe', 'keylog.txt',
  'steal_passwords', '.locked', 'HOW_TO_DECRYPT.txt', 'vssadmin.exe delete shadows',
  'RSA-2048', 'autorun.inf', '[autorun]', 'open=update.exe', 'powershell -enc',
  'IEX', 'crack', 'patch', 'disable_antivirus', 'Embedded EXE', 'CustomAction',
  'RunPowerShellScript', 'bot_id=', 'GetProcAddress', 'LoadLibraryA'
];

// 8. BENIGN STRINGS
const BENIGN_STRINGS = [
  'Microsoft Visual C++ Redistributable', 'Notepad++', 'Scintilla',
  'Calculator', 'CreateFileW', 'WriteFile', 'ReadFile', 'Windows Sockets 2.0 32-bit'
];

// 9. CLASSIFICATION
const CLASSIFICATION = [
  'Benign',       // Index 0
  'Suspicious',   // Index 1
  'Malware'       // Index 2
];

// 10. NEW: ENTROPY SECTIONS
const ENTROPY_SECTIONS = [
  '.text', '.data', '.rsrc', 'UPX0', 'UPX1', '.reloc'
];

// Export all lists to be used by the sample generator
module.exports = {
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
};
