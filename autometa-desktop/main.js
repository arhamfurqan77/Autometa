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
    generateMavenProject();
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

function generateMavenProject() {
  const projectRoot = path.join(__dirname, "AutometaProject");
  const srcDir = path.join(projectRoot, "src", "test", "java");

  // Create folders
  fs.mkdirSync(srcDir, { recursive: true });

  // ----------- Generate pom.xml -----------
  const pomContent = `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.autometa</groupId>
  <artifactId>autometa-project</artifactId>
  <version>1.0-SNAPSHOT</version>

  <dependencies>
    <dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>4.17.0</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.8.1</version>
        <configuration>
          <source>17</source>
          <target>17</target>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
`;

  fs.writeFileSync(path.join(projectRoot, "pom.xml"), pomContent);

  // ----------- Generate TestCase.java -----------
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

  fs.writeFileSync(path.join(srcDir, "TestCase.java"), javaCode);

  console.log("Maven project generated at:", projectRoot);
}

app.whenReady().then(createMainWindow);

module.exports = { openTargetWindow };
