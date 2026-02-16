
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

public class TestCase {

    public static void main(String[] args) {

        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
        driver.get("YOUR_URL_HERE");

        driver.findElement(By.cssSelector("span.title")).click();

        driver.findElement(By.cssSelector("a.ajax-link")).click();

        driver.findElement(By.cssSelector("#cmbsrStatus")).click();

        driver.findElement(By.cssSelector("#cmbsrStatus")).click();

        driver.findElement(By.cssSelector("span")).click();

        driver.findElement(By.cssSelector("a")).click();

        driver.findElement(By.cssSelector("#add")).click();

        driver.findElement(By.cssSelector("#btnSave")).click();

        driver.findElement(By.cssSelector("button.swal-button.swal-button--confirm")).click();

        driver.quit();
    }
}
