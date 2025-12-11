package com.lnt;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class AppTest {
    
    @Test
    public void testGetMessage() {
        App app = new App();
        String message = app.getMessage();
        assertEquals("Hello from L-T Connect!", message);
        System.out.println("✅ Test passed: " + message);
    }
    
    @Test
    public void testAppNotNull() {
        App app = new App();
        assertNotNull(app);
        System.out.println("✅ App object created successfully");
    }
}
