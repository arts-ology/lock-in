const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs/promises");

const SCREEN_WIDTH = 1024;
const SCREEN_HEIGHT = 600;

const DATA_DIR = path.join(__dirname, "data");
const QUOTES_PATH = path.join(DATA_DIR, "quotes.json");
const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");
const HISTORY_PATH = path.join(DATA_DIR, "history.json");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT, 
    resizable: false, 
    fullscreen: true, 
    frame: false,
    kiosk: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12") {
      mainWindow.webContents.toggleDevTools();
    }
    if (input.key === "Escape") {
      mainWindow.setKiosk(false);
    }
  });
}

app.whenReady().then(() => {
  globalShortcut.register("Control+Shift+Q", () => {
    app.quit();
  });

  createWindow();
});


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

async function readJSON(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf-8");
    return JSON.parse(text);
  } catch (err) {
    console.error(`Could not read ${filePath}:`, err.message);
    return fallback;
  }
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

ipcMain.handle("get-quotes", async () => {
  return readJSON(QUOTES_PATH, ["stay focused, you've got this", "just keep swimming", "one step at a time", "you are capable of amazing things", "believe in yourself", "keep going, you're doing great", "every day is a new opportunity", "small progress is still progress", "you are stronger than you think", "don't give up, you're almost there"]);
});

ipcMain.handle("get-settings", async () => {
  return readJSON(SETTINGS_PATH, {
    defaultTheme: "lilac",
    focusMinutes: 25,
    breakMinutes: 5,
    idleMinutes: 4,
  });
});

ipcMain.handle("save-settings", async (event, partialSettings) => {
  const current = await readJSON(SETTINGS_PATH, {});
  const updated = { ...current, ...partialSettings };
  await writeJSON(SETTINGS_PATH, updated);
  return updated;
});

ipcMain.handle("get-history", async () => {
  return readJSON(HISTORY_PATH, []);
});

ipcMain.handle("log-session", async (event, session) => {
  const history = await readJSON(HISTORY_PATH, []);
  history.push(session);
  await writeJSON(HISTORY_PATH, history);
  return history;
}); 

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});