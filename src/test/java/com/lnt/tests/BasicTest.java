package com.lnt.tests;

import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import io.github.bonigarcia.wdm.WebDriverManager;
import java.time.Duration;
import static org.assertj.core.api.Assertions.*;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class BasicTest {
    
    private WebDriver driver;
    
    @BeforeAll
    public void setupClass() {
        WebDriverManager.chromedriver().setup();
    }
    
    @BeforeEach
    public void setupTest() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        
        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    }
    
    @Test
    @DisplayName("Test GitHub Page Loads")
    public void testGitHubPageLoads() {
        driver.get("https://github.com/L-T-Development/L-T-Connect");
        
        String title = driver.getTitle();
        assertThat(title).contains("L-T-Connect");
    }
    
    @Test
    @DisplayName("Test Contributors Exists")
    public void testContributorsExists() {
        driver.get("https://github.com/L-T-Development/L-T-Connect");
        
        assertThat(driver.getPageSource())
            .containsAnyOf("Contributors", "contributor");
    }
    
    @AfterEach
    public void teardown() {
        if (driver != null) {
            driver.quit();
        }
    }
}
