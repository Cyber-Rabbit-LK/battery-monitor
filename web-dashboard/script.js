// Firebase configuration (ඔයාගේ web app credentials දාන්න)
const firebaseConfig = {
    apiKey: "your-web-api-key",
    authDomain: "your-auth-domain",
    databaseURL: "https://your-project.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let batteryChart;
let updateCount = 0;
const percentageHistory = [];
const timeLabels = [];

// Chart configuration
function initChart() {
    const ctx = document.getElementById('batteryChart').getContext('2d');
    batteryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Battery Percentage (%)',
                data: percentageHistory,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#22c55e',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 500,
                easing: 'easeInOutQuart'
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: '#e5e7eb'
                    },
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Time',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Battery: ${context.raw}%`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Update UI with animation
function updateUI(data) {
    // Update battery level bar with animation
    const batteryLevel = document.getElementById('batteryLevel');
    const percentage = data.percentage || 0;
    
    batteryLevel.style.setProperty('--target-width', `${percentage}%`);
    batteryLevel.style.width = `${percentage}%`;
    
    // Color based on percentage
    if (percentage > 50) {
        batteryLevel.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
    } else if (percentage > 20) {
        batteryLevel.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
    } else {
        batteryLevel.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
    
    // Update percentage number with animation
    const percentageElement = document.getElementById('percentage');
    const oldValue = parseInt(percentageElement.textContent) || 0;
    animateNumber(percentageElement, oldValue, percentage);
    
    // Update status badge
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    
    if (data.isCharging) {
        statusText.textContent = 'CHARGING ⚡';
        statusBadge.className = 'status-badge charging';
    } else {
        statusText.textContent = 'DISCHARGING 🔋';
        statusBadge.className = 'status-badge discharging';
    }
    
    // Update details
    document.getElementById('lastUpdate').textContent = new Date(data.timestamp).toLocaleTimeString();
    document.getElementById('cycleCount').textContent = data.cycleCount || 'N/A';
    document.getElementById('manufacturer').textContent = data.manufacturer || 'Unknown';
    document.getElementById('voltage').textContent = data.voltage ? `${data.voltage} V` : 'N/A';
    document.getElementById('acStatus').textContent = data.acConnected ? 'Connected' : 'Not Connected';
    document.getElementById('timeRemaining').textContent = data.timeRemaining ? `${Math.floor(data.timeRemaining)} min` : 'N/A';
    
    // Update chart
    updateChart(percentage);
    
    // Add to log
    addToLog(data);
}

// Animate number counting
function animateNumber(element, start, end) {
    const duration = 500;
    const step = (end - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
        current += step;
        if ((step > 0 && current >= end) || (step < 0 && current <= end)) {
            element.textContent = Math.round(end);
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Update chart with new data
function updateChart(percentage) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    percentageHistory.push(percentage);
    timeLabels.push(timeLabel);
    
    // Keep only last 10 points
    if (percentageHistory.length > 10) {
        percentageHistory.shift();
        timeLabels.shift();
    }
    
    if (batteryChart) {
        batteryChart.data.datasets[0].data = [...percentageHistory];
        batteryChart.data.labels = [...timeLabels];
        batteryChart.update('active');
    }
}

// Add entry to log
function addToLog(data) {
    const logContainer = document.getElementById('updateLog');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const time = new Date(data.timestamp).toLocaleTimeString();
    const status = data.isCharging ? 'charging' : 'discharging';
    const statusText = data.isCharging ? '⚡ Charging' : '🔋 Discharging';
    
    logEntry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-percentage">${data.percentage}%</span>
        <span class="log-status ${status}">${statusText}</span>
    `;
    
    logContainer.insertBefore(logEntry, logContainer.firstChild);
    
    // Keep only last 20 entries
    while (logContainer.children.length > 20) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// Listen for latest battery data from Firebase
function listenForBatteryUpdates() {
    const latestRef = database.ref('battery-data/latest');
    
    latestRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateUI(data);
            
            // Update connection status
            const statusDiv = document.getElementById('connectionStatus');
            statusDiv.innerHTML = '<span class="dot"></span> ✅ Connected to Firebase - Live';
        }
    }, (error) => {
        console.error('Error fetching data:', error);
        const statusDiv = document.getElementById('connectionStatus');
        statusDiv.innerHTML = '<span class="dot" style="background-color: #ef4444;"></span> ❌ Connection Error';
    });
}

// Load historical data
function loadHistoricalData() {
    const historyRef = database.ref('battery-data');
    historyRef.orderByKey().limitToLast(10).once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const history = [];
            Object.keys(data).forEach(key => {
                if (key !== 'latest' && data[key]) {
                    history.push(data[key]);
                }
            });
            
            // Display last 10 entries in reverse order
            history.reverse().slice(0, 10).forEach(entry => {
                addToLog(entry);
                if (entry.percentage) {
                    percentageHistory.push(entry.percentage);
                    timeLabels.push(new Date(entry.timestamp).toLocaleTimeString());
                }
            });
            
            if (batteryChart && percentageHistory.length > 0) {
                batteryChart.data.datasets[0].data = [...percentageHistory];
                batteryChart.data.labels = [...timeLabels];
                batteryChart.update();
            }
        }
    });
}

// Initialize everything
function init() {
    initChart();
    listenForBatteryUpdates();
    loadHistoricalData();
}

// Start when page loads
window.addEventListener('DOMContentLoaded', init);
