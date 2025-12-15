package com.lnt;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ValidationTest {
    
    @Test
    public void testEmailValidation() {
        String email = "user@lnt.com";
        assertTrue(email.contains("@"), "Email should contain @");
        assertTrue(email.contains("."), "Email should contain .");
    }
    
    @Test
    public void testPasswordLength() {
        String password = "password123";
        assertTrue(password.length() >= 8, "Password should be at least 8 characters");
    }
    
    @Test
    public void testPhoneNumber() {
        String phone = "9876543210";
        assertEquals(10, phone.length(), "Phone number should be 10 digits");
    }
    
    @Test
    public void testEmptyStringCheck() {
        String empty = "";
        assertTrue(empty.isEmpty(), "String should be empty");
    }
    
    @Test
    public void testNullCheck() {
        String nullStr = null;
        assertNull(nullStr, "String should be null");
    }
    
    @Test
    public void testNotNullCheck() {
        String notNull = "value";
        assertNotNull(notNull, "String should not be null");
    }
    
    @Test
    public void testNumberRange() {
        int age = 25;
        assertTrue(age >= 18 && age <= 100, "Age should be in valid range");
    }
}
