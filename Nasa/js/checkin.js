// Find the check-in form
const checkinForm = document.getElementById("healthCheckin");
// Clear sleep validation message when the user corrects the input
const sleepHoursInput = document.getElementById("sleepHours");
const formMessage = document.getElementById("formMessage");

// Clear the previous message when the user starts editing the form
if (checkinForm && formMessage) {
  checkinForm.addEventListener("input", function () {
    formMessage.textContent = "";
    formMessage.className = "";
  });

  checkinForm.addEventListener("change", function () {
    formMessage.textContent = "";
    formMessage.className = "";
  });
}

if (sleepHoursInput && formMessage) {
  sleepHoursInput.addEventListener("input", function () {
    const value = sleepHoursInput.value;
    const hours = Number(value);

    if (value.trim() === "") {
      formMessage.textContent = "";
      formMessage.className = "";
      return;
    }

    if (hours < 0 || hours > 24) {
      formMessage.textContent =
        "Please enter a valid sleep duration between 0 and 24 hours.";
      formMessage.className = "error-message";
    } else {
      formMessage.textContent = "";
      formMessage.className = "";
    }
  });
}
// Handle form submission
if (checkinForm) {
  checkinForm.addEventListener("submit", function (event) {
    // Prevent page refresh
    event.preventDefault();

    const sleepHoursInput = document.getElementById("sleepHours");
    const sleepHours = Number(sleepHoursInput.value);

    if (
      sleepHoursInput.value.trim() === "" ||
      sleepHours < 0 ||
      sleepHours > 24
    ) {
      formMessage.textContent =
        "Please enter a valid sleep duration between 0 and 24 hours.";

      formMessage.className = "error-message";

      return;
    }

    // Collect selected symptoms
    const selectedSymptoms = document.querySelectorAll(
      'input[name="symptoms"]:checked',
    );

    const symptoms = Array.from(selectedSymptoms).map(
      (checkbox) => checkbox.value,
    );

    // Create check-in object
    const checkin = {
      date: new Date().toISOString(),
      feeling: document.getElementById("feeling").value,
      sleepHours: sleepHours,
      symptoms: symptoms,
      stress: document.getElementById("stress").value,
      notes: document.getElementById("notes").value,
    };

    // Get previously saved check-ins
    let savedCheckins = JSON.parse(localStorage.getItem("checkins")) || [];

    // Add the new check-in
    savedCheckins.push(checkin);

    // Save all check-ins
    localStorage.setItem("checkins", JSON.stringify(savedCheckins));

    // Save the latest check-in separately
    localStorage.setItem("latestCheckin", JSON.stringify(checkin));

    // Evaluate this Daily Check-in and publish any flag to the main Alerts page.
    // These prototype thresholds are screening flags, not medical instructions.
    const checkinFlags = [];
    if (checkin.feeling === "not-good") checkinFlags.push("Crew member reported feeling not good");
    if (checkin.sleepHours < 6) checkinFlags.push(`Sleep duration was below 6 hours (${checkin.sleepHours} hours)`);
    if (checkin.stress === "high") checkinFlags.push("High stress level was reported");
    if (checkin.symptoms.length > 0) {
      const symptomLabels = {
        dizziness: "Dizziness",
        nausea: "Nausea",
        fatigue: "Unusual fatigue",
        "vision-changes": "Vision changes"
      };
      checkinFlags.push("Reported symptoms: " + checkin.symptoms.map(item => symptomLabels[item] || item).join(", "));
    }

    if (checkinFlags.length > 0 && typeof publishMainAlert === "function") {
      publishMainAlert({
        id: `checkin-${checkin.date}`,
        source: "Daily Check-in",
        level: "WARNING",
        title: "DAILY CHECK-IN: OFF-NOMINAL INDICATORS REPORTED",
        message: "The latest Daily Check-in contains one or more indicators that should be reviewed by the crew medical team.",
        details: checkinFlags,
        actions: [
          "Notify the crew medical officer / ground medical team and review the reported indicators.",
          "Ask the medical team to assess whether activation of the Lower Body Negative Pressure (LBNP) suit is appropriate under the mission medical protocol.",
          "Do not treat this alert as an automatic suit-activation command or a medical diagnosis."
        ],
        date: new Date(checkin.date).toLocaleString(),
        timestamp: new Date(checkin.date).getTime()
      });
    }

    // Update Dashboard if its function is available
    if (typeof updateDashboardFromCheckin === "function") {
      updateDashboardFromCheckin(checkin);
    }

    // Show confirmation
    formMessage.textContent = "Your check-in has been submitted successfully!";

    formMessage.className = "success-message";

    // Reset the form
    checkinForm.reset();

    console.log("Saved check-in:", checkin);
  });
}

// ===== Sleep Duration Chart =====

let sleepChart = null;
let stressChart = null;
let symptomsChart = null;

function updateSleepChart(savedCheckins) {
  const chartCanvas = document.getElementById("sleepChart");

  if (!chartCanvas || typeof Chart === "undefined") return;

  const labels = savedCheckins.map((checkin) =>
    new Date(checkin.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const sleepData = savedCheckins.map((checkin) => checkin.sleepHours);

  if (sleepChart) {
    sleepChart.data.labels = labels;
    sleepChart.data.datasets[0].data = sleepData;

    sleepChart.update();
  } else {
    sleepChart = new Chart(chartCanvas, {
      type: "line",

      data: {
        labels: labels,

        datasets: [
          {
            label: "Sleep Hours",
            data: sleepData,
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
          },
        ],
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        scales: {
          y: {
            beginAtZero: true,
            max: 24,
            title: {
              display: true,
              text: "Hours",
            },
          },

          x: {
            title: {
              display: true,
              text: "Check-in Time",
            },
          },
        },
      },
    });
  }
}
// ===== Stress Level Chart =====

function updateStressChart(savedCheckins) {
  const chartCanvas = document.getElementById("stressChart");

  if (!chartCanvas || typeof Chart === "undefined") return;

  // Convert stress levels into numbers
  const stressLevels = {
    low: 1,
    moderate: 2,
    high: 3,
  };

  const labels = savedCheckins.map((checkin) =>
    new Date(checkin.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const stressData = savedCheckins.map(
    (checkin) => stressLevels[checkin.stress],
  );

  if (stressChart) {
    stressChart.data.labels = labels;
    stressChart.data.datasets[0].data = stressData;
    stressChart.update();
  } else {
    stressChart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Reported Stress Level",
            data: stressData,
            borderColor: "#f97316",
            backgroundColor: "rgba(249, 115, 22, 0.1)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 1,
            max: 3,
            ticks: {
              stepSize: 1,
              callback: function (value) {
                const labels = {
                  1: "Low",
                  2: "Moderate",
                  3: "High",
                };
                return labels[value];
              },
            },
            title: {
              display: true,
              text: "Stress Level",
            },
          },
          x: {
            title: {
              display: true,
              text: "Check-in Time",
            },
          },
        },
      },
    });
  }
}
// ===== Symptoms Frequency Chart =====

function updateSymptomsChart(savedCheckins) {
  const chartCanvas = document.getElementById("symptomsChart");

  if (!chartCanvas || typeof Chart === "undefined") return;

  // Count how many times each symptom was reported
  const symptomCounts = {
    Dizziness: 0,
    Nausea: 0,
    "Unusual fatigue": 0,
    "Vision changes": 0,
  };

  const symptomMapping = {
    dizziness: "Dizziness",
    nausea: "Nausea",
    fatigue: "Unusual fatigue",
    "vision-changes": "Vision changes",
  };

  savedCheckins.forEach((checkin) => {
    checkin.symptoms.forEach((symptom) => {
      const symptomName = symptomMapping[symptom];

      if (symptomName) {
        symptomCounts[symptomName]++;
      }
    });
  });

  const labels = Object.keys(symptomCounts);
  const data = Object.values(symptomCounts);

  if (symptomsChart) {
    symptomsChart.data.labels = labels;
    symptomsChart.data.datasets[0].data = data;
    symptomsChart.update();
  } else {
    symptomsChart = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Number of Reports",
            data: data,
            backgroundColor: ["#6366f1", "#ec4899", "#f59e0b", "#14b8a6"],
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
            title: {
              display: true,
              text: "Number of Reports",
            },
          },
          x: {
            title: {
              display: true,
              text: "Symptoms",
            },
          },
        },
      },
    });
  }
}
// Display saved check-ins on the Trends page
function renderCheckinHistory() {
  const historyContainer = document.getElementById("checkinHistory");

  if (!historyContainer) return;

  const savedCheckins = JSON.parse(localStorage.getItem("checkins")) || [];

  historyContainer.innerHTML = "";
  // Update Sleep Duration Chart
  updateSleepChart(savedCheckins);

  // Update Stress Level Chart
  updateStressChart(savedCheckins);
  // Update Symptoms Frequency Chart
  updateSymptomsChart(savedCheckins);

  if (savedCheckins.length === 0) {
    historyContainer.textContent = "No check-ins recorded yet.";
    return;
  }

  // Display newest check-ins first
  savedCheckins.forEach((checkin, index) => {
    const card = document.createElement("div");
    card.classList.add("history-card");

    const dateText = document.createElement("h3");
    dateText.textContent = new Date(checkin.date).toLocaleString();

    const feelingText = document.createElement("p");
    feelingText.textContent = "Feeling: " + checkin.feeling;

    const sleepText = document.createElement("p");
    sleepText.textContent = "Sleep: " + checkin.sleepHours + " hours";

    const symptomsText = document.createElement("p");
    symptomsText.textContent =
      "Symptoms: " + (checkin.symptoms.join(", ") || "None");

    const stressText = document.createElement("p");
    stressText.textContent = "Stress: " + checkin.stress;

    // Create Delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.type = "button";

    deleteButton.addEventListener("click", function () {
      const confirmed = confirm(
        "Are you sure you want to delete this check-in?",
      );

      if (!confirmed) return;

      // Remove selected check-in
      savedCheckins.splice(index, 1);

      // Save updated history
      localStorage.setItem("checkins", JSON.stringify(savedCheckins));

      // Update latest check-in
      const latestCheckin =
        savedCheckins.length > 0
          ? savedCheckins[savedCheckins.length - 1]
          : null;

      localStorage.setItem("latestCheckin", JSON.stringify(latestCheckin));

      // Refresh history
      renderCheckinHistory();

      // Refresh Dashboard
      if (latestCheckin) {
        if (typeof updateDashboardFromCheckin === "function") {
          updateDashboardFromCheckin(latestCheckin);
        }
      } else {
        if (typeof resetDashboardSleep === "function") {
          resetDashboardSleep();
        }
      }
    });

    card.append(
      dateText,
      feelingText,
      sleepText,
      symptomsText,
      stressText,
      deleteButton,
    );

    historyContainer.appendChild(card);
  });
}

// Refresh history when Trends page is opened
const trendsButton = document.querySelector('[data-page="trends"]');

if (trendsButton) {
  trendsButton.addEventListener("click", renderCheckinHistory);
}
