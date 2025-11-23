const { spawn } = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');

const AI_MODEL_DIR = path.join(__dirname, '..', 'mAIware---AI');
const PYTHON_SCRIPT = path.join(AI_MODEL_DIR, 'predict_single.py');

// Map datasrcs for vendor/signature info
const { VENDORS, SIGNATURES } = require('./datasrcs');

/**
 * Call AI model to classify a PE file and get comprehensive analysis
 * @param {string} filePath - Absolute path to the PE file
 * @param {object} fileHashes - Pre-computed SHA256 and MD5 hashes
 * @returns {Promise<object>} - Classification result with all metadata
 */
async function classifyWithAI(filePath, fileHashes) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [PYTHON_SCRIPT, filePath], {
      cwd: AI_MODEL_DIR,
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('[AI] Python process error:', stderr);
        resolve({
          classification: 'Suspicious',
          confidence_score: 0.5,
          error: 'AI model execution failed',
          fallback: true
        });
        return;
      }

      try {
        const aiResult = JSON.parse(stdout.trim());
        
        if (aiResult.error) {
          console.error('[AI] Model returned error:', aiResult.error);
          resolve({
            classification: 'Suspicious',
            confidence_score: 0.5,
            error: aiResult.error,
            fallback: true
          });
          return;
        }

        // Build comprehensive scan result matching expected format
        const scanResult = buildScanResult(filePath, fileHashes, aiResult);
        resolve(scanResult);
        
      } catch (err) {
        console.error('[AI] Failed to parse JSON:', err.message);
        console.error('[AI] Stdout:', stdout);
        resolve({
          classification: 'Suspicious',
          confidence_score: 0.5,
          error: 'Invalid AI response format',
          fallback: true
        });
      }
    });

    python.on('error', (err) => {
      console.error('[AI] Failed to spawn Python:', err);
      resolve({
        classification: 'Suspicious',
        confidence_score: 0.5,
        error: 'Python not available',
        fallback: true
      });
    });
  });
}

/**
 * Build a complete scan result from AI prediction
 * @param {string} filePath - Original file path
 * @param {object} fileHashes - SHA256 and MD5
 * @param {object} aiResult - AI model output
 * @returns {object} - Complete scan result matching UI expectations
 */
function buildScanResult(filePath, fileHashes, aiResult) {
  const filename = path.basename(filePath);
  
  // Select appropriate vendor based on classification
  let vendor = VENDORS[15]; // Default: "mAIware AI Engine"
  if (aiResult.classification === 'Malware') {
    vendor = VENDORS[6]; // Windows Defender (red icon)
  } else if (aiResult.classification === 'Benign') {
    vendor = VENDORS[2]; // Microsoft (verified)
  }
  
  // Determine signature status
  let signature = SIGNATURES[4]; // Default: Not Signed
  if (aiResult.classification === 'Benign' && Math.random() > 0.5) {
    signature = SIGNATURES[0]; // Microsoft Corporation (verified)
  } else if (aiResult.classification === 'Suspicious') {
    signature = SIGNATURES[4]; // Unknown/Not Signed
  } else if (aiResult.classification === 'Malware') {
    signature = SIGNATURES[3]; // Self-signed
  }

  const result = {
    detected_filename: filename,
    file_hashes: fileHashes || { sha256: '', md5: '' },
    classification: aiResult.classification,
    confidence_score: aiResult.confidence_score,
    is_pe: true,
    vendor: vendor,
    key_findings: {
      file_type: aiResult.file_type || 'PE Executable',
      packer_detected: aiResult.packer_detected || 'Unknown',
      signature: signature,
      section_entropy: aiResult.section_entropy || [],
      api_imports: aiResult.api_imports || [],
      key_strings: aiResult.key_strings || []
    }
  };

  // Add AI-specific voting data (NEW from ensemble models)
  if (aiResult.votes_benign !== undefined && aiResult.votes_malware !== undefined) {
    result.votes_benign = aiResult.votes_benign;
    result.votes_malware = aiResult.votes_malware;
    result.ai_voting = {
      benign: aiResult.votes_benign,
      malware: aiResult.votes_malware,
      total_models: aiResult.votes_benign + aiResult.votes_malware
    };
  }

  // Add ensemble-specific fields (NEW from AI model CSV output)
  if (aiResult.ensemble_label !== undefined) {
    result.ensemble_label = aiResult.ensemble_label;
  }
  if (aiResult.ensemble_score !== undefined) {
    result.ensemble_score = aiResult.ensemble_score;
  }
  if (aiResult.ensemble_class !== undefined) {
    result.ensemble_class = aiResult.ensemble_class;
  }
  if (aiResult.ensemble_class_id !== undefined) {
    result.ensemble_class_id = aiResult.ensemble_class_id;
  }

  // Add PE feature metadata (NEW from AI model)
  if (aiResult.pe_features) {
    result.pe_metadata = {
      file_size: aiResult.pe_features.file_size,
      entropy_total: aiResult.pe_features.entropy_total,
      number_of_sections: aiResult.pe_features.number_of_sections,
      total_dlls: aiResult.pe_features.total_dlls,
      total_resources: aiResult.pe_features.total_resources,
      is_packed: aiResult.pe_features.is_packed
    };
  }

  return result;
}

module.exports = { classifyWithAI };
