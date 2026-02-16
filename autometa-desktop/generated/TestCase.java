
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

public class TestCase {

    public static void main(String[] args) {

        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
        driver.get("YOUR_URL_HERE");


        driver.findElement(By.cssSelector("#usernam")).click();

        driver.findElement(By.cssSelector("#pasword")).click();

        driver.findElement(By.cssSelector("#btnlogin")).click();

        driver.findElement(By.cssSelector("span.title")).click();

        driver.findElement(By.cssSelector("a.ajax-link")).click();

        driver.findElement(By.cssSelector("#cmbsrStatus")).click();

        driver.findElement(By.cssSelector("#cmbsrStatus")).click();

        driver.findElement(By.cssSelector("span")).click();

        driver.findElement(By.cssSelector("a")).click();

        driver.findElement(By.cssSelector("#add")).click();

        driver.findElement(By.cssSelector("#modal-lg")).click();

        driver.quit();
    }
}
