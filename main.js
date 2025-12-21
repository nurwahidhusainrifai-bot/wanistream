const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

let mainWindow;
let serverProcess;
let clientProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "WANIstream Pro - Desktop",
        icon: path.join(__dirname, 'client/public/favicon.ico'), // Adjust if icon exists
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#0f172a', // Match dark-900
    });

    // Hide menu bar
    mainWindow.setMenuBarVisibility(false);

    // Load the frontend
    // In production, we would load the built index.html
    // For now, we point to the dev server
    mainWindow.loadURL('http://localhost:5173');

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startBackend() {
    console.log('Starting Backend Service...');
    serverProcess = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'server'),
        shell: true,
        env: { ...process.env, PORT: 5000 }
    });

    serverProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
    serverProcess.stderr.on('data', (data) => console.error(`[Backend Error]: ${data}`));
}

function startFrontend() {
    console.log('Starting Frontend Service...');
    clientProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, 'client'),
        shell: true
    });

    clientProcess.stdout.on('data', (data) => console.log(`[Frontend]: ${data}`));
}

app.on('ready', () => {
    // Start backend
    startBackend();

    // Start frontend
    startFrontend();

    // Wait for the frontend to be ready before opening the window
    const opts = {
        resources: ['http://localhost:5173'],
        timeout: 30000,
    };

    waitOn(opts)
        .then(() => {
            createWindow();
        })
        .catch((err) => {
            console.error('Failed to wait for frontend:', err);
        });
});

app.on('window-all-closed', function () {
    // Kill processes on exit
    if (serverProcess) serverProcess.kill();
    if (clientProcess) clientProcess.kill();

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// Clean up on exit
process.on('exit', () => {
    if (serverProcess) serverProcess.kill();
    if (clientProcess) clientProcess.kill();
});
