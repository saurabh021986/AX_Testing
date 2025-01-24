import com.deque.html.axecore.results.Results;
import com.deque.html.axecore.selenium.AxeBuilder;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;

import java.io.FileWriter;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class AccessibilityTest {

    // Set the base URL of the web application
    private static final String BASE_URL = "https://example.com";
    private static final Set<String> visitedPages = new HashSet<>();

    public static void main(String[] args) {
        // Set up WebDriver (Chrome in this case)
        System.setProperty("webdriver.chrome.driver", "path/to/chromedriver");
        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();

        try {
            // Start crawling and testing for accessibility
            crawlAndTest(driver, BASE_URL);
        } finally {
            // Close the browser
            driver.quit();
            System.out.println("Accessibility testing completed!");
        }
    }

    private static void crawlAndTest(WebDriver driver, String url) {
        // Avoid re-visiting the same URL
        if (visitedPages.contains(url)) return;
        visitedPages.add(url);

        try {
            // Navigate to the page
            driver.get(url);
            Thread.sleep(2000); // Wait for the page to load completely

            // Run accessibility tests using axe-core
            runAxeAnalysis(driver, url);

            // Find all internal links on the page
            List<WebElement> links = driver.findElements(By.tagName("a"));
            for (WebElement link : links) {
                String href = link.getAttribute("href");
                if (href != null && href.startsWith(BASE_URL)) {
                    crawlAndTest(driver, href); // Recursively visit each link
                }
            }
        } catch (Exception e) {
            System.out.println("Error while processing URL " + url + ": " + e.getMessage());
        }
    }

    private static void runAxeAnalysis(WebDriver driver, String url) {
        System.out.println("Scanning: " + url);
        try {
            // Create an AxeBuilder object to run axe-core tests
            AxeBuilder axeBuilder = new AxeBuilder();
            Results results = axeBuilder.analyze(driver);

            // Save the results to a JSON file
            String fileName = "axe_report_" + url.replace("https://", "").replace("/", "_") + ".json";
            try (FileWriter fileWriter = new FileWriter(fileName)) {
                fileWriter.write(results.toJson());
                System.out.println("Accessibility report saved to: " + fileName);
            }
        } catch (IOException e) {
            System.out.println("Error saving report for " + url + ": " + e.getMessage());
        }
    }
}
