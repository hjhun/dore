import { app, BrowserWindow } from "electron";
import { join } from "node:path";

async function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    title: "Dore",
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const rendererUrl = process.env.DORE_DESKTOP_RENDERER_URL;
  if (rendererUrl) {
    await window.loadURL(rendererUrl);
  } else {
    await window.loadFile(join(import.meta.dirname, "../../renderer/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

