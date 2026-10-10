/**
 * RoadWise SJDM - Production Session Guard
 * Implements 15-minute idle sliding expiration, 2-minute countdown modal,
 * and 8-hour absolute maximum shift cap.
 */
(function initSessionGuard() {
  const IDLE_LIMIT_MS = 15 * 60 * 1000;      // 15 Minutes
  const WARNING_LIMIT_MS = 13 * 60 * 1000;   // 13 Minutes (Triggers 2-min warning)
  const ABSOLUTE_LIMIT_MS = 8 * 60 * 60 * 1000; // 8 Hours

  let lastActivity = Date.now();
  let warningActive = false;
  let countdownTimer = null;

  // Retrieve or initialize login timestamp
  let loginTime = parseInt(sessionStorage.getItem("rw_login_time"), 10);
  if (!loginTime) {
    loginTime = Date.now();
    sessionStorage.setItem("rw_login_time", loginTime.toString());
  }

  // 1. Inject Styles for Warning Modal
  const style = document.createElement("style");
  style.innerHTML = `
    .rw-timeout-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px); z-index: 999999; display: flex;
      align-items: center; justify-content: center; opacity: 0;
      pointer-events: none; transition: opacity 0.25s ease;
    }
    .rw-timeout-backdrop.active { opacity: 1; pointer-events: auto; }
    .rw-timeout-modal {
      background: #ffffff; border-radius: 14px; width: 92%; max-width: 440px;
      padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
      border: 1px solid #e2e8f0; font-family: inherit; text-align: center;
    }
    .rw-timeout-icon {
      width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 50%;
      background: #fef3c7; color: #d97706; display: flex; align-items: center;
      justify-content: center; font-size: 24px;
    }
    .rw-timeout-title { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .rw-timeout-desc { font-size: 0.9rem; color: #64748b; line-height: 1.5; margin-bottom: 16px; }
    .rw-timeout-clock { font-size: 1.6rem; font-weight: 800; color: #dc2626; margin-bottom: 20px; font-variant-numeric: tabular-nums; }
    .rw-timeout-actions { display: flex; gap: 10px; }
    .rw-timeout-btn-stay {
      flex: 1; background: #2563eb; color: #ffffff; border: none; padding: 10px 14px;
      border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;
    }
    .rw-timeout-btn-stay:hover { background: #1d4ed8; }
    .rw-timeout-btn-exit {
      flex: 1; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;
      padding: 10px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;
    }
    .rw-timeout-btn-exit:hover { background: #e2e8f0; }
  `;
  document.head.appendChild(style);

  // 2. Inject Modal Elements into Document Body
  const modalMarkup = document.createElement("div");
  modalMarkup.className = "rw-timeout-backdrop";
  modalMarkup.id = "rwTimeoutModal";
  modalMarkup.innerHTML = `
    <div class="rw-timeout-modal">
      <div class="rw-timeout-icon">⏱</div>
      <div class="rw-timeout-title">Session Inactivity Warning</div>
      <div class="rw-timeout-desc">
        You have been inactive for several minutes. For municipal data security, your session will automatically terminate.
      </div>
      <div class="rw-timeout-clock" id="rwTimeoutTimer">02:00</div>
      <div class="rw-timeout-actions">
        <button class="rw-timeout-btn-stay" id="rwTimeoutStayBtn">Stay Logged In</button>
        <button class="rw-timeout-btn-exit" id="rwTimeoutExitBtn">Log Out</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalMarkup);

  const backdrop = document.getElementById("rwTimeoutModal");
  const clockText = document.getElementById("rwTimeoutTimer");
  const stayBtn = document.getElementById("rwTimeoutStayBtn");
  const exitBtn = document.getElementById("rwTimeoutExitBtn");

  stayBtn.addEventListener("click", () => extendSession());
  exitBtn.addEventListener("click", () => terminateSession("manual"));

  // 3. User Interaction Activity Listener (Debounced)
  let lastEventRecord = 0;
  function registerActivity() {
    const now = Date.now();
    // Throttle checks to once every 2 seconds to keep browser operations lightweight
    if (now - lastEventRecord > 2000) {
      lastEventRecord = now;
      if (!warningActive) {
        lastActivity = now;
      }
    }
  }

  ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach(evt => {
    window.addEventListener(evt, registerActivity, { passive: true });
  });

  // 4. Timer Interval Worker (Checks every second)
  setInterval(() => {
    const now = Date.now();
    const idleDuration = now - lastActivity;
    const totalSessionDuration = now - loginTime;

    // Hard shift cap (8 Hours)
    if (totalSessionDuration >= ABSOLUTE_LIMIT_MS) {
      terminateSession("shift_ended");
      return;
    }

    // Idle expiration (15 Minutes)
    if (idleDuration >= IDLE_LIMIT_MS) {
      terminateSession("timeout");
      return;
    }

    // Trigger Warning Modal (13 Minutes mark -> 2 minutes remaining)
    if (idleDuration >= WARNING_LIMIT_MS && !warningActive) {
      triggerWarning();
    }
  }, 1000);

  function triggerWarning() {
    warningActive = true;
    backdrop.classList.add("active");

    countdownTimer = setInterval(() => {
      const remainingMs = Math.max(0, IDLE_LIMIT_MS - (Date.now() - lastActivity));
      const totalSec = Math.floor(remainingMs / 1000);
      const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const sec = String(totalSec % 60).padStart(2, "0");

      clockText.textContent = `${min}:${sec}`;

      if (remainingMs <= 0) {
        clearInterval(countdownTimer);
        terminateSession("timeout");
      }
    }, 1000);
  }

  function extendSession() {
    warningActive = false;
    clearInterval(countdownTimer);
    backdrop.classList.remove("active");
    lastActivity = Date.now();

    // Ping backend /verify-session to advance server-side activity clock
    const userId = sessionStorage.getItem("userId");
    const role = sessionStorage.getItem("userRole");
    const baseUrl = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";

    if (userId && role && baseUrl) {
      fetch(`${baseUrl}/api/auth/verify-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId, role: role })
      }).catch(err => console.warn("Session ping error:", err));
    }
  }

  function terminateSession(reason) {
    const userId = sessionStorage.getItem("userId");
    const baseUrl = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";

    if (userId && baseUrl) {
      fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId })
      }).catch(() => {});
    }

    sessionStorage.clear();
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");

    window.location.replace(`login.html?reason=${reason}`);
  }
})();
