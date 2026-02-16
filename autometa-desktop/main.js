const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let targetWindow;
let recordedActions = [];
let recordedUrl = "";

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
    recordedActions = [];
    recordedUrl = url;
    openTargetWindow(url);
  });

  ipcMain.on("recorded-action", (event, data) => {
    recordedActions.push(data);
    console.log("Saved Action:", data);
  });

  ipcMain.on("save-recording", () => {
    saveRecording();
    generateMavenProject();

    if (targetWindow && !targetWindow.isDestroyed()) {
      targetWindow.close();
    }

    mainWindow.webContents.send("recording-saved");
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

    let lastElement = null;

    const allowedTags = ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"];

    function getBestLocator(el) {

      if (el.id && el.id.trim() !== "") {
        return { type: "css", value: "#" + el.id };
      }

      if (el.name && el.name.trim() !== "") {
        return { 
          type: "css", 
          value: el.tagName.toLowerCase() + "[name='" + el.name + "']" 
        };
      }

      if (el.innerText && el.innerText.trim().length > 0 && el.innerText.length < 40) {
        return { 
          type: "xpath", 
          value: "//" + el.tagName.toLowerCase() + "[contains(text(),'" + el.innerText.trim() + "')]" 
        };
      }

      return null;
    }

    // -------- CLICK LISTENER --------
    document.addEventListener("click", function(e) {

      let element = e.target.closest("button, a, input, select, textarea");
      if (!element) return;

      if (!allowedTags.includes(element.tagName)) return;

      if (element === lastElement) return;
      lastElement = element;

      const locator = getBestLocator(element);
      if (!locator) return;

      const data = {
        action: "click",
        locatorType: locator.type,
        locatorValue: locator.value
      };

      window.postMessage({ type: "AUTOMETA_RECORD", payload: data }, "*");
    });

    // -------- INPUT LISTENER (SMART) --------
let typingTimeout = null;

document.addEventListener("input", function(e) {

  let element = e.target;
  if (!["INPUT", "TEXTAREA"].includes(element.tagName)) return;

  const locator = getBestLocator(element);
  if (!locator) return;

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {

    const data = {
      action: "type",
      locatorType: locator.type,
      locatorValue: locator.value,
      value: element.value
    };

    window.postMessage({ type: "AUTOMETA_RECORD", payload: data }, "*");

  }, 600); // waits 600ms after user stops typing

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
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

public class TestCase {

    public static void main(String[] args) {

        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
       driver.get("${recordedUrl}");

        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
`;

  recordedActions.forEach((action) => {
    if (action.action === "click") {
      javaCode += `
        wait.until(ExpectedConditions.elementToBeClickable(
            ${
              action.locatorType === "xpath"
                ? `By.xpath("${action.locatorValue}")`
                : `By.cssSelector("${action.locatorValue}")`
            }
        )).click();
`;
    }

    if (action.action === "type") {
      javaCode += `
        wait.until(ExpectedConditions.visibilityOfElementLocated(
            ${
              action.locatorType === "xpath"
                ? `By.xpath("${action.locatorValue}")`
                : `By.cssSelector("${action.locatorValue}")`
            }
        )).sendKeys("${action.value}");
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
