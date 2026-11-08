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

  function render() {
    const area = document.getElementById("mainAlertsList");
    if (!area) return;
    const alerts = readAlerts().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (!alerts.length) {
      area.innerHTML = '<p class="main-alerts-empty">No alerts recorded yet.</p>';
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
      </article>`).join("");
  }

  window.publishMainAlert = function (alert) {
    const alerts = readAlerts();
    // Prevent duplicate alerts when the same check-in/event is processed again.
    if (alert.id && alerts.some(item => item.id === alert.id)) return;
    alerts.unshift(alert);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, MAX_ALERTS)));
    render();
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
          alerts.push({ ...item, id, source: "Performance Assessment" });
          known.add(id);
        }
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(-MAX_ALERTS)));
    } catch (error) {
      console.warn("Could not import Performance Assessment alerts", error);
    }
  }

  window.addEventListener("performance:alert", event => {
    if (event.detail) window.publishMainAlert({ ...event.detail, source: "Performance Assessment" });
  });
  const alertsButton = document.querySelector('[data-page="alerts"]');
  if (alertsButton) alertsButton.addEventListener("click", render);
  importAssessmentAlerts();
  render();
})();
