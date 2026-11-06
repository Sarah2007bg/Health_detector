// ===== Health Data =====

const healthData = {
  // Current Values
  heartRate: 72,
  oxygenLevel: 98,
  bodyTemperature: 36.8,
  sleepDuration: 7.5,

  // Statuses
  heartRateStatus: "Normal",
  oxygenStatus: "Normal",
  temperatureStatus: "Normal",
  sleepStatus: "Recorded",

  // Historical Data
  heartRateHistory: [70, 74, 72, 76, 71, 72],

  days: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"],
};

// ===== Update Dashboard Cards =====

// Safely update an HTML element
function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function updateDashboardCards() {
  // Update Card Values
  setText("heartRateValue", healthData.heartRate);
  setText("oxygenValue", healthData.oxygenLevel);
  setText("temperatureValue", healthData.bodyTemperature);
  setText("sleepValue", healthData.sleepDuration);

  // Update Card Statuses
  setText("heartRateStatus", healthData.heartRateStatus);
  setText("oxygenStatus", healthData.oxygenStatus);
  setText("temperatureStatus", healthData.temperatureStatus);
  setText("sleepStatus", healthData.sleepStatus);

  // Update Health Summary
  setText("summaryHeartRate", "Stable");
  setText("summaryOxygen", healthData.oxygenStatus);
  setText("summaryTemperature", healthData.temperatureStatus);
  setText("summarySleep", healthData.sleepStatus);
}

// ===== Update Dashboard from Check-in =====

function updateDashboardFromCheckin(checkin) {
  // Update sleep duration
  healthData.sleepDuration = checkin.sleepHours;

  // Update sleep status
  healthData.sleepStatus = "Recorded";

  // Refresh Dashboard cards and summary
  updateDashboardCards();
}

// ===== Reset Dashboard Sleep Data =====

function resetDashboardSleep() {

    healthData.sleepDuration = 7.5;
    healthData.sleepStatus = "Recorded";

    updateDashboardCards();
}

// ===== Heart Rate Chart =====

const ctx = document.getElementById("heartRateChart");

if (ctx) {
  new Chart(ctx, {
    type: "line",

    data: {
      labels: healthData.days,

      datasets: [
        {
          label: "Heart Rate (BPM)",
          data: healthData.heartRateHistory,

          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",

          borderWidth: 3,
          tension: 0.4,
          fill: true,

          pointRadius: 4,
          pointBackgroundColor: "#3b82f6",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: true,
        },
      },

      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

// ===== Initialize Dashboard =====

// Load the latest saved check-in
const latestCheckin = JSON.parse(localStorage.getItem("latestCheckin"));

// Update Dashboard using saved data
if (latestCheckin) {
  updateDashboardFromCheckin(latestCheckin);
} else {
  updateDashboardCards();
}
