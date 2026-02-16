const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let targetWindow;
let recordedActions = [];

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  ipcMain.on("open-site", (event, url) => {
    openTargetWindow(url);
  });

  ipcMain.on("recorded-action", (event, data) => {
    recordedActions.push(data);
    console.log("Saved Action:", data);
  });

  ipcMain.on("save-recording", () => {
    saveRecording();
    generateJavaFile();
  });

  mainWindow.loadFile("index.html");
}

function openTargetWindow(url) {
  targetWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  targetWindow.loadURL(url);

  targetWindow.webContents.on("did-finish-load", () => {
    injectRecorder();

    targetWindow.webContents.executeJavaScript(`
    window.addEventListener("message", (event) => {
      if (event.data.type === "AUTOMETA_RECORD") {
        require("electron").ipcRenderer.send("recorded-action", event.data.payload);
      }
    });
  `);
  });
}

function injectRecorder() {
  targetWindow.webContents.executeJavaScript(`
  document.addEventListener("click", function(e) {
      const element = e.target;

    function getCssSelector(el) {
      if (el.id) return "#" + el.id;
      if (el.className)
        return el.tagName.toLowerCase() + "." +
               el.className.split(" ").join(".");
      return el.tagName.toLowerCase();
    }

      const data = {
        action: "click",
        tag: element.tagName,
        id: element.id || null,
        class: element.className || null,
        name: element.name || null,
        text: element.innerText || null,
        css: getCssSelector(element)
      };

      window.postMessage({ type: "AUTOMETA_RECORD", payload: data }, "*");
    });
  `);
}

function saveRecording() {
  const filePath = path.join(__dirname, "recording.json");
  fs.writeFileSync(filePath, JSON.stringify(recordedActions, null, 2));
  console.log("Recording saved to:", filePath);
}

function generateJavaFile() {
  const outputDir = path.join(__dirname, "generated");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  let javaCode = `
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

public class TestCase {

    public static void main(String[] args) {

        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
        driver.get("YOUR_URL_HERE");

`;

  recordedActions.forEach((action) => {
    if (action.action === "click") {
      javaCode += `
        driver.findElement(By.cssSelector("${action.css}")).click();
`;
    }
  });

  javaCode += `
        driver.quit();
    }
}
`;

  const filePath = path.join(outputDir, "TestCase.java");
  fs.writeFileSync(filePath, javaCode);

  console.log("Java file generated at:", filePath);
}

app.whenReady().then(createMainWindow);

module.exports = { openTargetWindow };
