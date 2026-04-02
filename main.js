const { app, BrowserWindow, ipcMain } = require('electron');
const si = require('systeminformation');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, serverTimestamp } = require('firebase/database');

// Firebase configuration (ඔයාගේ credentials දාන්න)
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    databaseURL: "https://your-project.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

let mainWindow;

// Function to send battery data to Firebase
async function sendBatteryDataToFirebase() {
    try {
        const batteryData = await si.battery();
        
        const dataToSave = {
            timestamp: serverTimestamp(),
            hasBattery: batteryData.hasBattery,
            percentage: batteryData.percent,
            isCharging: batteryData.isCharging,
            acConnected: batteryData.acConnected,
            timeRemaining: batteryData.timeRemaining || 0,
            cycleCount: batteryData.cycleCount || 0,
            manufacturer: batteryData.manufacturer || 'Unknown',
            model: batteryData.model || 'Unknown',
            voltage: batteryData.voltage || 0,
            currentCapacity: batteryData.currentCapacity || 0,
            maxCapacity: batteryData.maxCapacity || 0
        };
        
        // Save to Firebase with current timestamp as key
        const batteryRef = ref(database, 'battery-data/' + Date.now());
        await set(batteryRef, dataToSave);
        
        // Also save latest data separately for easy access
        const latestRef = ref(database, 'battery-data/latest');
        await set(latestRef, dataToSave);
        
        console.log(`✅ Data sent to Firebase: ${batteryData.percent}% at ${new Date().toLocaleTimeString()}`);
        
        // Send to Electron GUI
        if (mainWindow) {
            mainWindow.webContents.send('battery-update', dataToSave);
        }
        
    } catch (error) {
        console.error('❌ Error sending to Firebase:', error);
    }
}

// Create Electron window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: 'battery-icon.png'
    });
    
    mainWindow.loadFile('index.html');
    
    // Start sending data every 10 seconds
    setInterval(() => {
        sendBatteryDataToFirebase();
    }, 10000); // 10 seconds
    
    // Send initial data immediately
    setTimeout(() => {
        sendBatteryDataToFirebase();
    }, 2000);
}

app.whenReady().then(() => {
    createWindow();
    
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC for manual refresh
ipcMain.on('refresh-battery', async (event) => {
    const battery = await si.battery();
    event.reply('battery-data', battery);
});
