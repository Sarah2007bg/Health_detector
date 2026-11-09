/* Central Alerts page for Daily Check-in and Performance Assessment. */
(function () {
  const STORAGE_KEY = "mainSiteAlerts";
  const MAX_ALERTS = 100;

  function readAlerts() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Could not read main site alerts", error);
      return [];
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  /* Add-on styles are injected here so the existing project CSS stays untouched. */
  function addEnhancementStyles() {
    if (document.getElementById("main-alert-enhancement-styles")) return;
    const style = document.createElement("style");
    style.id = "main-alert-enhancement-styles";
    style.textContent = `
      .alerts-nav-dot{display:inline-block;width:9px;height:9px;margin-left:8px;border-radius:50%;background:#ef4444;vertical-align:middle;box-shadow:0 0 0 2px #fff}
      .main-alert-review{margin-top:14px;padding:9px 14px;border:0;border-radius:7px;background:#176b9c;color:#fff;font-weight:600;cursor:pointer}
      .main-alert-review:disabled{background:#64748b;cursor:default}
      .main-alert-reviewed{display:inline-block;margin-top:12px;color:#166534;font-size:13px;font-weight:700}
      #mainAlertToast{position:fixed;right:22px;top:22px;z-index:9999;max-width:340px;padding:15px 18px;border-radius:10px;background:#172554;color:#fff;box-shadow:0 8px 24px #0003;font-size:14px;line-height:1.5}
      #mainAlertToast strong{display:block;margin-bottom:4px}
    `;
    document.head.appendChild(style);
  }

  function updateAlertsBadge() {
    const button = document.querySelector('[data-page="alerts"]');
    if (!button) return;
    let dot = button.querySelector(".alerts-nav-dot");
    const hasUnreviewed = readAlerts().some(alert => !alert.reviewed);
    if (hasUnreviewed && !dot) {
      dot = document.createElement("span");
      dot.className = "alerts-nav-dot";
      dot.setAttribute("aria-label", "New unreviewed alerts");
      button.appendChild(dot);
    } else if (!hasUnreviewed && dot) {
      dot.remove();
    }
  }

  function showAlertNotification(alert) {
    const oldToast = document.getElementById("mainAlertToast");
    if (oldToast) oldToast.remove();
    const toast = document.createElement("div");
    toast.id = "mainAlertToast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<strong>New ${escapeHTML(alert.level || "health")} alert</strong>${escapeHTML(alert.title || alert.message || "A new health alert needs review.")}`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 6000);
  }

  function render() {
    const area = document.getElementById("mainAlertsList");
    if (!area) return;
    const alerts = readAlerts().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (!alerts.length) {
      area.innerHTML = '<p class="main-alerts-empty">No alerts recorded yet.</p>';
      updateAlertsBadge();
      return;
    }
    area.innerHTML = alerts.map(alert => `
      <article class="main-alert-card ${alert.level === "CRITICAL" ? "critical" : "warning"}">
        <div class="main-alert-meta"><span>${escapeHTML(alert.level || "ALERT")}</span><span>${escapeHTML(alert.source || "Health Monitor")}</span></div>
        <h2>${escapeHTML(alert.title || "Health alert")}</h2>
        <p>${escapeHTML(alert.message || "")}</p>
        ${Array.isArray(alert.details) && alert.details.length ? `<h3>Reported indicators</h3><ul>${alert.details.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>` : ""}
        ${Array.isArray(alert.actions) && alert.actions.length ? `<h3>Recommended follow-up</h3><ul>${alert.actions.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>` : ""}
        <small>${escapeHTML(alert.date || "")}</small>
        <p class="main-alert-disclaimer">Prototype notification for review by the mission medical team; not a diagnosis or an autonomous operational command.</p>
        ${alert.reviewed ? '<span class="main-alert-reviewed">Reviewed</span>' : `<button type="button" class="main-alert-review" data-review-alert="${escapeHTML(alert.id || "")}">Mark as Reviewed</button>`}
      </article>`).join("");
    updateAlertsBadge();
  }

  window.publishMainAlert = function (alert) {
    const alerts = readAlerts();
    // Prevent duplicate alerts when the same check-in/event is processed again.
    if (alert.id && alerts.some(item => item.id === alert.id)) return;
    alerts.unshift({ ...alert, reviewed: false });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, MAX_ALERTS)));
    render();
    showAlertNotification(alert);
  };

  // Import existing Performance Assessment alerts once, retaining their IDs.
  function importAssessmentAlerts() {
    try {
      const imported = JSON.parse(localStorage.getItem("performanceAssessmentAlerts") || "[]");
      if (!Array.isArray(imported)) return;
      const alerts = readAlerts();
      const known = new Set(alerts.map(item => item.id).filter(Boolean));
      imported.forEach((item, index) => {
        const id = item.id || `assessment-${item.timestamp || item.date || index}`;
        if (!known.has(id)) {
          alerts.push({ ...item, id, source: "Performance Assessment", reviewed: false });
          known.add(id);
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(-MAX_ALERTS)));
    } catch (error) {
      console.warn("Could not import Performance Assessment alerts", error);
    }
  }

  // Mark an alert as reviewed without changing its original content.
  document.addEventListener("click", event => {
    const reviewButton = event.target.closest("[data-review-alert]");
    if (!reviewButton) return;
    const alertId = reviewButton.getAttribute("data-review-alert");
    const alerts = readAlerts();
    const selectedAlert = alerts.find(item => String(item.id || "") === alertId);
    if (!selectedAlert) return;
    selectedAlert.reviewed = true;
    selectedAlert.reviewedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    render();
  });

  window.addEventListener("performance:alert", event => {
    if (event.detail) window.publishMainAlert({ ...event.detail, source: "Performance Assessment" });
  });
  const alertsButton = document.querySelector('[data-page="alerts"]');
  if (alertsButton) alertsButton.addEventListener("click", render);
  addEnhancementStyles();
  importAssessmentAlerts();
  render();
})();
