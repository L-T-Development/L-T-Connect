package com.lnt.selenium.tests;

import com.lnt.selenium.base.BaseTest;
import com.lnt.selenium.pages.LoginPage;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class LoginTest extends BaseTest {
    
    @Test
    public void testValidLogin() {
        driver.get(baseUrl + "/login");
        LoginPage loginPage = new LoginPage(driver);
        
        loginPage.login("admin", "admin123");
        
        // Verify successful login by checking URL or dashboard element
        assertTrue(driver.getCurrentUrl().contains("/dashboard"), 
                   "User should be redirected to dashboard after login");
    }
    
    @Test
    public void testInvalidLogin() {
        driver.get(baseUrl + "/login");
        LoginPage loginPage = new LoginPage(driver);
        
        loginPage.login("invalid", "wrong");
        
        String errorMsg = loginPage.getErrorMessage();
        assertTrue(errorMsg.contains("Invalid credentials"), 
                   "Error message should display for invalid login");
    }
    
    @Test
    public void testEmptyFields() {
        driver.get(baseUrl + "/login");
        LoginPage loginPage = new LoginPage(driver);
        
        loginPage.clickLogin();
        
        // Verify form validation
        assertTrue(driver.getCurrentUrl().contains("/login"), 
                   "Should remain on login page when fields are empty");
    }
}
