// --- MOCK DISASSEMBLY DATA ---
const mockDisassemblyBenign = [
    `<span class="addr">0x401000</span> <span class="op">PUSH</span> <span class="args">ebp</span> <span class="comment">; setup stack frame</span>`,
    `<span class="addr">0x401001</span> <span class="op">MOV</span> <span class="args">ebp, esp</span>`,
    `<span class="addr">0x401003</span> <span class="op">SUB</span> <span class="args">esp, 48h</span>`,
    `<span class="addr">0x401006</span> <span class="op">MOV</span> <span class="args">[ebp-10h], eax</span>`,
    `<span class="addr">0x401009</span> <span class="op">MOV</span> <span class="args">[ebp-1Ch], edx</span>`,
    `<span class="addr">0x40100C</span> <span class="op">CALL</span> <span class="args">0x4012A0</span> <span class="comment">; initialize_string</span>`,
    `<span class="addr">0x401011</span> <span class="op">LEA</span> <span class="args">eax, [ebp-28h]</span>`,
    `<span class="addr">0x401014</span> <span class="op">PUSH</span> <span class="args">eax</span>`,
    `<span class="addr">0x401015</span> <span class="op">CALL</span> <span class="args">0x4013F0</span> <span class="comment">; get_user_input</span>`,
    `<span class="addr">0x40101A</span> <span class="op">MOV</span> <span class="args">eax, [ebp-28h]</span>`,
    `<span class="addr">0x40101D</span> <span class="op">PUSH</span> <span class="args">eax</span>`,
    `<span class="addr">0x40101E</span> <span class="op">CALL</span> <span class="args">0x4015D0</span> <span class="comment">; print_output</span>`,
    `<span class="addr">0x401023</span> <span class="op">XOR</span> <span class="args">eax, eax</span>`,
    `<span class="addr">0x401025</span> <span class="op">MOV</span> <span class="args">esp, ebp</span>`,
    `<span class="addr">0x401027</span> <span class="op">POP</span> <span class="args">ebp</span>`,
    `<span class="addr">0x401028</span> <span class="op">RETN</span>`,
    `<span class="addr">...</span>`,
];

const mockDisassemblySuspicious = [
    `<span class="addr">0x401000</span> <span class="op">PUSH</span> <span class="args">ebp</span>`,
    `<span class="addr">0x401001</span> <span class="op">MOV</span> <span class="args">ebp, esp</span>`,
    `<span class="addr">0x401003</span> <span class="op">SUB</span> <span class="args">esp, 80h</span>`,
    `<span class="addr">0x401009</span> <span class="op">LEA</span> <span class="args">eax, [ebp-80h]</span> <span class="comment">; buffer start</span>`,
    `<span class="addr">0x40100C</span> <span class="op">PUSH</span> <span class="args">eax</span>`,
    `<span class="addr">0x40100D</span> <span class="op">CALL</span> <span class="args">0x4012A0</span> <span class="comment">; read_file_to_buffer</span>`,
    `<span class="addr">0x401012</span> <span class="op">MOV</span> <span class="args">ecx, [ebp+8]</span> <span class="comment">; user input size?</span>`,
    `<span class="addr">0x401015</span> <span class="op">LEA</span> <span class="args">edx, [ebp-40h]</span>`,
    `<span class="addr">0x401018</span> <span class="op">MOV</span> <span class="args">eax, [ebp-80h]</span>`,
    `<span class="addr">0x40101B</span> <span class="op">REP</span> <span class="op">MOVSB</span> <span class="comment">; unsafe buffer write</span>`,
    `<span class="addr">0x40101D</span> <span class="op">CMP</span> <span class="args">ecx, 80h</span>`,
    `<span class="addr">0x401020</span> <span class="op">JGE</span> <span class="args">0x401030</span> <span class="comment">; jump if overflow</span>`,
    `<span class="addr">0x401022</span> <span class="op">MOV</span> <span class="args">eax, 0</span>`,
    `<span class="addr">0x401027</span> <span class="op">LEAVE</span>`,
    `<span class="addr">0x401028</span> <span class="op">RETN</span>`,
    `<span class="addr">...</span>`,
];

const mockDisassemblyMalware = [
    `<span class="addr">0x401000</span> <span class="op">PUSH</span> <span class="args">ebp</span> <span class="comment">; setup stack frame</span>`,
    `<span class="addr">0x401001</span> <span class="op">MOV</span> <span class="args">ebp, esp</span>`,
    `<span class="addr">0x401003</span> <span class="op">SUB</span> <span class="args">esp, 108h</span>`,
    `<span class="addr">0x401009</span> <span class="op">PUSH</span> <span class="args">3Eh</span>`,
    `<span class="addr">0x40100B</span> <span class="op">CALL</span> <span class="args">0x4011B0</span> <span class="comment">; kernel32.LoadLibraryA</span>`,
    `<span class="addr">0x401010</span> <span class="op">MOV</span> <span class="args">[ebp-18h], eax</span>`,
    `<span class="addr">0x401013</span> <span class="op">PUSH</span> <span class="string">"CreateRemoteThread"</span>`,
    `<span class="addr">0x401018</span> <span class="op">PUSH</span> <span class="args">eax</span>`,
    `<span class="addr">0x401019</span> <span class="op">CALL</span> <span class="args">0x4011C0</span> <span class="comment">; kernel32.GetProcAddress</span>`,
    `<span class="addr">0x40101E</span> <span class="op">MOV</span> <span class="args">[ebp-24h], eax</span>`,
    `<span class="addr">0x401021</span> <span class="op">LEA</span> <span class="args">ecx, [ebp-108h]</span>`,
    `<span class="addr">0x401027</span> <span class="op">PUSH</span> <span class="args">ecx</span>`,
    `<span class="addr">0x401028</span> <span class="op">CALL</span> <span class="args">0x4012F0</span> <span class="comment">; decrypt_payload</span>`,
    `<span class="addr">0x40102D</span> <span class="op">XOR</span> <span class="args">edx, edx</span>`,
    `<span class="addr">0x40102F</span> <span class="op">PUSH</span> <span class="args">edx</span>`,
    `<span class="addr">0x401030</span> <span class="op">PUSH</span> <span class="args">edx</span>`,
    `<span class="addr">0x401031</span> <span class="op">PUSH</span> <span class="args">[ebp-20h]</span> <span class="comment">; process_handle</span>`,
    `<span class="addr">0x401034</span> <span class="op">CALL</span> <span class="args">[ebp-24h]</span> <span class="comment">; call CreateRemoteThread</span>`,
    `<span class="addr">0x401037</span> <span class="op">JMP</span> <span class="args">0x40102D</span> <span class="comment">; loop?</span>`,
    `<span class="addr">...</span>`,
];

// --- MOCK GRAPH DATA ---
const mockGraphSafe = {
    nodes: [
        { id: 'safe-main', label: 'main', class: 'node-entry', pos: { top: '80px', left: '50px' } },
        { id: 'safe-init', label: 'initialize_string', class: 'node-std', pos: { top: '30px', left: '300px' } },
        { id: 'safe-input', label: 'get_user_input', class: 'node-std', pos: { top: '100px', left: '300px' } },
        { id: 'safe-print', label: 'print_output', class: 'node-std', pos: { top: '170px', left: '300px' } }
    ],
    edges: [
        { from: 'safe-main', to: 'safe-init', options: { color: '#888' } },
        { from: 'safe-main', to: 'safe-input', options: { color: '#888' } },
        { from: 'safe-main', to: 'safe-print', options: { color: '#888' } }
    ]
};

const mockGraphSuspicious = {
    nodes: [
        { id: 'susp-main', label: 'main', class: 'node-entry', pos: { top: '80px', left: '50px' } },
        { id: 'susp-read', label: 'read_file_to_buffer', class: 'node-std', pos: { top: '80px', left: '250px' } },
        { id: 'susp-movsb', label: 'REP MOVSB (unsafe)', class: 'node-suspicious', pos: { top: '80px', left: '550px' } }
    ],
    edges: [
        { from: 'susp-main', to: 'susp-read', options: { color: '#888' } },
        { from: 'susp-read', to: 'susp-movsb', options: { color: '#f1c40f' } }
    ]
};

const mockGraphMalware = {
    nodes: [
        { id: 'mal-main', label: 'main', class: 'node-entry', pos: { top: '150px', left: '20px' } },
        { id: 'mal-loadlib', label: 'kernel32.LoadLibraryA', class: 'node-api', pos: { top: '50px', left: '250px' } },
        { id: 'mal-getproc', label: 'kernel32.GetProcAddress', class: 'node-api', pos: { top: '120px', left: '250px' } },
        { id: 'mal-decrypt', label: 'decrypt_payload', class: 'node-suspicious', pos: { top: '220px', left: '250px' } },
        { id: 'mal-createthread', label: 'CreateRemoteThread', class: 'node-malicious', pos: { top: '120px', left: '500px' } },
        { id: 'mal-loop', label: 'JMP (loop)', class: 'node-suspicious', pos: { top: '290px', left: '400px' } }
    ],
    edges: [
        { from: 'mal-main', to: 'mal-loadlib', options: { color: '#888' } },
        { from: 'mal-main', to: 'mal-getproc', options: { color: '#888' } },
        { from: 'mal-main', to: 'mal-decrypt', options: { color: '#f1c40f' } },
        { from: 'mal-getproc', to: 'mal-createthread', options: { color: '#e74c3c' } },
        { from: 'mal-decrypt', to: 'mal-createthread', options: { color: '#e74c3c' } },
        { from: 'mal-createthread', to: 'mal-loop', options: { color: '#f1c40f' } },
        { from: 'mal-loop', to: 'mal-decrypt', options: { 
            color: '#f1c40f', 
            path: 'arc', 
            startSocket: 'bottom', 
            endSocket: 'bottom' 
          } 
        }
    ]
};


// --- Hardcoded Result Data ---
const resultData = {
    safe: {
        score: 12,
        resultClass: 'result-safe',
        progressClass: 'progress-bar-green',
        scoreClass: 'score-green',
        icon: 'fas fa-check-circle',
        title: 'FILE IS SAFE',
        reason: 'This program prints a message. No suspicious indicators found.',
        hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        recommendation: 'You can safely run this file.',
        disassembly: mockDisassemblyBenign,
        bodyClass: 'result-safe-active',
        graph: mockGraphSafe
    },
    suspicious: {
        score: 68,
        resultClass: 'result-suspicious',
        progressClass: 'progress-bar-yellow',
        scoreClass: 'score-yellow',
        icon: 'fas fa-exclamation-triangle',
        title: 'SUSPICIOUS',
        reason: 'We found an unsafe buffer write. This could be an exploit.',
        hash: 'f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2',
        recommendation: 'Be cautious. Only run if you trust the source.',
        disassembly: mockDisassemblySuspicious,
        bodyClass: 'result-suspicious-active',
        graph: mockGraphSuspicious
    },
    malware: {
        score: 97,
        resultClass: 'result-malware',
        progressClass: 'progress-bar-red',
        scoreClass: 'score-red',
        icon: 'fas fa-bug',
        title: 'MALWARE DETECTED',
        reason: 'We found a suspicious call to CreateRemoteThread.',
        hash: 'b4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5',
        recommendation: 'DO NOT OPEN. Quarantine this file immediately.',
        disassembly: mockDisassemblyMalware,
        bodyClass: 'result-malware-active',
        graph: mockGraphMalware
    }
};


// --- ELEMENT REFERENCES ---
const initialState = document.getElementById('initial-state');
const analyzingState = document.getElementById('analyzing-state');
const resultState = document.getElementById('result-state');

const analyzingFilename = document.getElementById('analyzing-filename');
const resultIcon = document.getElementById('result-icon');
const resultText = document.getElementById('result-text');
const resultFilename = document.getElementById('result-filename');
const resultDetails = document.getElementById('result-details');

const bodyEl = document.body;
let animationWrapper = null;

const disassemblyWrapper = document.getElementById('disassembly-wrapper');
const disassemblyCodeEl = document.getElementById('disassembly-code');
const disassemblyFilenameEl = document.getElementById('disassembly-filename');

// Analysis Details elements
const analysisDetailsWrapper = document.getElementById('analysis-details-wrapper');
const progressBarFill = document.getElementById('progress-bar-fill');
const scorePercentage = document.getElementById('score-percentage');
const detailsReasoning = document.getElementById('details-reasoning');
const detailsHash = document.getElementById('details-hash');
const detailsRecommendation = document.getElementById('details-recommendation');

// History Panel elements
const historyBtn = document.getElementById('history-btn');
const historyPanel = document.getElementById('history-panel');
const historyCloseBtn = document.getElementById('history-close-btn');
const historyOverlay = document.getElementById('history-overlay');

// Scroll Zone elements
const scrollZoneTop = document.getElementById('scroll-zone-top');
const scrollZoneBottom = document.getElementById('scroll-zone-bottom');

// Graph Panel elements
const graphWrapper = document.getElementById('graph-wrapper');
const callGraphEl = document.getElementById('call-graph');

// Stats elements
const statsWrapper = document.getElementById('stats-wrapper');


// --- STATE ---
const demoFilename = "demo_file.exe";
let clickCount = 0;
let disassemblyInterval = null;
let scrollInterval = null; // For auto-scrolling
let currentLines = []; // For graph arrows

// ---TRANG TEST NEW IPC LISTENERS (This replaces the demo logic) ---

// --- NEW IPC LISTENERS (This replaces the demo logic) ---

// 1. Listen for the 'scan-started' message from the backend
window.electronAPI.onScanStarted((filename) => {
  console.log(`UI: Received scan-started for ${filename}`);
  
  // 1. Set UI to "Analyzing" state
  initialState.classList.remove('active'); //
  analyzingState.classList.add('active'); //
  analyzingFilename.textContent = filename; //
  disassemblyFilenameEl.textContent = filename; //

  // 2. Update body class to show disassembly
  bodyEl.classList.remove('is-showing-result'); //
  bodyEl.classList.add('is-analyzing'); //
  removeAnimationClasses(); //
  
  // 3. Populate disassembly with a "suspicious" default and start animation
  // (We don't know the result yet, so we pick one)
  populateDisassembly(mockDisassemblySuspicious); //
  startDisassemblyAnimation(); //
});

// 2. Listen for the 'scan-result' message from the backend
window.electronAPI.onScanResult((scanResult) => {
  console.log("UI: Received scan-result:", scanResult);

  // 1. Stop disassembly animation
  clearInterval(disassemblyInterval); //
  disassemblyInterval = null; //

  // 2. Update body classes
  bodyEl.classList.remove('is-analyzing'); //
  bodyEl.classList.add('is-showing-result'); //
  
  // 3. Show "Result" state in scanner
  analyzingState.classList.remove('active'); //
  resultState.classList.add('active'); //

  // --- 4. MAP YOUR JSON DATA TO THE UI ---

  // Determine result type
  let resultType = 'safe';
  let resultIconClass = 'fas fa-check-circle'; //
  let resultMockGraph = mockGraphSafe; //
  let resultMockDisassembly = mockDisassemblyBenign; //
  let resultBodyClass = 'result-safe-active'; //
  let resultScannerClass = 'result-safe'; //
  let resultProgressClass = 'progress-bar-green'; //
  let resultScoreClass = 'score-green'; //
  let recommendation = 'You can safely run this file.'; //

  if (scanResult.classification.includes("Malware")) {
    resultType = 'malware';
    resultIconClass = 'fas fa-bug'; //
    resultMockGraph = mockGraphMalware; //
    resultMockDisassembly = mockDisassemblyMalware; //
    resultBodyClass = 'result-malware-active'; //
    resultScannerClass = 'result-malware'; //
    resultProgressClass = 'progress-bar-red'; //
    resultScoreClass = 'score-red'; //
    recommendation = 'DO NOT OPEN. Quarantine this file immediately.'; //
  } else if (scanResult.classification.includes("Suspicious")) {
    resultType = 'suspicious';
    resultIconClass = 'fas fa-exclamation-triangle'; //
    resultMockGraph = mockGraphSuspicious; //
    resultMockDisassembly = mockDisassemblySuspicious; //
    resultBodyClass = 'result-suspicious-active'; //
    resultScannerClass = 'result-suspicious'; //
    resultProgressClass = 'progress-bar-yellow'; //
    resultScoreClass = 'score-yellow'; //
    recommendation = 'Be cautious. Only run if you trust the source.'; //
  }
  
  // Create the animation wrapper (from your original script)
  if (!animationWrapper) {
      animationWrapper = document.createElement('div');
      animationWrapper.className = 'animation-swarm';
      for (let i = 0; i < 10; i++) {
          const particle = document.createElement('span');
          animationWrapper.appendChild(particle);
      }
      bodyEl.prepend(animationWrapper);
  }
  bodyEl.classList.add(resultBodyClass); //

  // 5. Populate Scanner Panel
  resultState.className = `scanner-state active ${resultScannerClass}`; //
  resultIcon.className = `result-icon ${resultIconClass}`; //
  resultText.textContent = scanResult.classification; //
  resultDetails.textContent = `Scanned ${scanResult.scanned_sample_name} via ${scanResult.vendor}`; //
  resultFilename.textContent = scanResult.detected_filename; //

  // 6. Populate NEW Analysis Details Panel
  progressBarFill.className = 'progress-bar-fill'; //
  scorePercentage.className = 'score-percentage'; //
  
  progressBarFill.classList.add(resultProgressClass); //
  progressBarFill.style.width = `${scanResult.confidence_score * 100}%`; //
  
  scorePercentage.textContent = `${(scanResult.confidence_score * 100).toFixed(0)}%`; //
  scorePercentage.classList.add(resultScoreClass); //

  // --- This is the key mapping ---
  detailsReasoning.textContent = `Filetype: ${scanResult.key_findings.file_type}. Packer: ${scanResult.key_findings.packer_detected}.`; //
  detailsHash.textContent = scanResult.file_hashes.sha256; //
  detailsRecommendation.textContent = recommendation;

  // 7. Populate Disassembly & Graph
  // (We use the mock data based on classification for the demo)
  populateDisassembly(resultMockDisassembly); //
  drawCallGraph(resultMockGraph); //
});

function removeAnimationClasses() {
    bodyEl.classList.remove('result-safe-active');
    bodyEl.classList.remove('result-suspicious-active');
    bodyEl.classList.remove('result-malware-active');
}

// --- Disassembly Functions ---

function populateDisassembly(codeLines) {
    disassemblyCodeEl.innerHTML = '';
    codeLines.forEach((line, index) => {
        const lineEl = document.createElement('span');
        lineEl.className = 'disassembly-line';
        lineEl.id = `line-${index}`;
        lineEl.innerHTML = line;
        disassemblyCodeEl.appendChild(lineEl);
    });
}

function startDisassemblyAnimation() {
    if (disassemblyInterval) {
        clearInterval(disassemblyInterval);
    }
    let currentLine = 0;
    const totalLines = disassemblyCodeEl.children.length;

    disassemblyInterval = setInterval(() => {
        const prevLine = document.querySelector('.disassembly-line.active');
        if (prevLine) {
            prevLine.classList.remove('active');
        }

        const lineEl = document.getElementById(`line-${currentLine}`);
        if (lineEl) {
            lineEl.classList.add('active');
            lineEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
        currentLine = (currentLine + 1) % totalLines;
    }, 150);
}


// --- Graph Drawing ---
function drawCallGraph(graphData) {
    // 1. Clear previous graph (both nodes and lines)
    callGraphEl.innerHTML = '';
    currentLines.forEach(line => line.remove());
    currentLines = [];

    // 2. Create and place all nodes
    graphData.nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.id = node.id;
        nodeEl.className = `graph-node ${node.class}`;
        nodeEl.style.top = node.pos.top;
        nodeEl.style.left = node.pos.left;
        nodeEl.textContent = node.label;
        callGraphEl.appendChild(nodeEl);
    });

    // 3. Draw all edges (must be done *after* nodes are in DOM)
    // Use a slight timeout to ensure DOM is ready
    setTimeout(() => {
        graphData.edges.forEach(edge => {
            try {
                const line = new LeaderLine(
                    document.getElementById(edge.from),
                    document.getElementById(edge.to),
                    {
                        color: edge.options.color,
                        path: edge.options.path || 'straight',
                        startSocket: edge.options.startSocket || 'auto',
                        endSocket: edge.options.endSocket || 'auto',
                        endPlug: 'arrow1',
                        size: 3,
                        endPlugSize: 1.5,
                    }
                );
                currentLines.push(line);
            } catch(e) {
                console.error("Could not draw line:", e);
            }
        });
    }, 500); // 500ms timeout to let CSS fade-in finish
}


// --- History Panel Logic ---
function toggleHistoryPanel() {
    bodyEl.classList.toggle('is-history-open');
}

historyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleHistoryPanel();
});
historyCloseBtn.addEventListener('click', toggleHistoryPanel);
historyOverlay.addEventListener('click', toggleHistoryPanel);


// --- Auto-scroll Logic ---
function startScrolling(direction) {
    if (scrollInterval) {
        clearInterval(scrollInterval);
    }
    scrollInterval = setInterval(() => {
        window.scrollBy(0, direction * 10); // 10 pixels at a time
    }, 20); // every 20ms
}

function stopScrolling() {
    clearInterval(scrollInterval);
    scrollInterval = null;
}

scrollZoneTop.addEventListener('mouseenter', () => {
    startScrolling(-1); // Scroll Up
    scrollZoneTop.classList.add('scrolling');
});
scrollZoneTop.addEventListener('mouseleave', () => {
    stopScrolling();
    scrollZoneTop.classList.remove('scrolling');
});

scrollZoneBottom.addEventListener('mouseenter', () => {
    startScrolling(1); // Scroll Down
    scrollZoneBottom.classList.add('scrolling');
});
scrollZoneBottom.addEventListener('mouseleave', () => {
    stopScrolling();
    scrollZoneBottom.classList.remove('scrolling');
});


// --- NEW: Run on Page Load ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Animate Stat Cards
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const target = +stat.getAttribute('data-target');
        const duration = 2000;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = target / steps;
        let current = 0;

        const updateCount = () => {
            current += increment;
            if (current < target) {
                stat.textContent = Math.ceil(current).toLocaleString();
                setTimeout(updateCount, stepTime);
            } else {
                stat.textContent = target.toLocaleString();
            }
        };
        updateCount();
    });

    // 2. Create Malware Types Chart (Doughnut)
    const typesCtx = document.getElementById('malwareTypesChart');
    if (typesCtx) {
        new Chart(typesCtx, {
            type: 'doughnut',
            data: {
                labels: ['PE (exe/dll)', 'JavaScript', 'VBS', 'Macro', 'Other'],
                datasets: [{
                    label: 'Submission Types',
                    data: [65, 15, 8, 7, 5],
                    backgroundColor: [
                        '#007bff', // Blue
                        '#f1c40f', // Yellow
                        '#e74c3c', // Red
                        '#9b59b6', // Purple
                        '#34495e'  // Gray
                    ],
                    borderColor: '#2a2a2e',
                    borderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e0e0e0', // Text color
                            boxWidth: 20
                        }
                    }
                }
            }
        });
    }

    // 3. Create Top Malware Chart (Line)
    const topMalwareCtx = document.getElementById('topMalwareChart');
    if (topMalwareCtx) {
        new Chart(topMalwareCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
                datasets: [
                    {
                        label: 'Zeus',
                        data: [120, 150, 130, 180, 160],
                        borderColor: '#e74c3c',
                        backgroundColor: '#e74c3c20',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'WannaCry',
                        data: [80, 90, 110, 100, 130],
                        borderColor: '#007bff',
                        backgroundColor: '#007bff20',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Emotet',
                        data: [50, 60, 80, 70, 90],
                        borderColor: '#f1c40f',
                        backgroundColor: '#f1c40f20',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0' // Text color
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#aaa' },
                        grid: { color: '#44444450' }
                    },
                    y: {
                        ticks: { color: '#aaa' },
                        grid: { color: '#444444' }
                    }
                }
            }
        });
    }
});
