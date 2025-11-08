// This file acts as our "database" of mappings, just as you requested.

// 1. VENDORS (20 samples)
const VENDORS = [
  'Google', 'VirusTotal', 'Microsoft', 'CrowdStrike', 'SentinelOne', 
  'Palo Alto Networks', 'McAfee', 'Symantec (Broadcom)', 'Kaspersky', 'ESET',
  'Malwarebytes', 'Sophos', 'Trend Micro', 'FireEye (Trellix)', 'Zscaler',
  'Cisco Talos', 'Avast', 'Bitdefender', 'Fortinet', 'Check Point'
];

// 2. DIGITAL SIGNATURES
const SIGNATURES = [
  'Verified (Microsoft Corporation)', 'Verified (Google LLC)', 'Verified (Notepad++ team)',
  'Verified (Unknown Publisher)', 'Not Signed', 'Expired Certificate', 'Self-Signed (Untrusted)'
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

// 6. SUSPICIOUS API IMPORTS (Using indexes from this list)
const SUSPICIOUS_APIS = [
  'CreateRemoteThread', 'SetWindowsHookExW', 'URLDownloadToFileW', 'Socket',
  'CryptGenKey', 'CryptEncrypt', 'DeleteFileW', 'WriteProcessMemory',
  'ReadProcessMemory', 'OpenProcess', 'WinExec', 'VirtualAllocEx',
  'RegSetValueExW', 'CopyFileW', 'SetFileAttributesW', 'NtInjectThread'
];

// 7. SUSPICIOUS STRINGS (Using indexes from this list)
const SUSPICIOUS_STRINGS = [
  'http://bad-c2-server.com/payload.dat', '/temp/vbc.exe', 'keylog.txt',
  'steal_passwords', '.locked', 'HOW_TO_DECRYPT.txt', 'vssadmin.exe delete shadows',
  'RSA-2048', 'autorun.inf', '[autorun]', 'open=update.exe', 'powershell -enc',
  'IEX', 'crack', 'patch', 'disable_antivirus', 'Embedded EXE', 'CustomAction',
  'RunPowerShellScript', 'bot_id=', 'GetProcAddress', 'LoadLibraryA'
];

// 8. BENIGN STRINGS (Using indexes from this list)
const BENIGN_STRINGS = [
  'Microsoft Visual C++ Redistributable', 'Notepad++', 'Scintilla',
  'Calculator', 'CreateFileW', 'WriteFile', 'ReadFile', 'Windows Sockets 2.0 32-bit'
];

// Export all lists to be used by the sample generator
module.exports = {
  VENDORS,
  SIGNATURES,
  FILE_TYPES,
  PACKERS,
  MALWARE_FAMILIES,
  SUSPICIOUS_APIS,
  SUSPICIOUS_STRINGS,
  BENIGN_STRINGS
};
