package com.lnt;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class BasicUnitTest {
    
    @Test
    public void testAddition() {
        assertEquals(4, 2 + 2, "Basic addition should work");
    }
    
    @Test
    public void testSubtraction() {
        assertEquals(5, 10 - 5, "Basic subtraction should work");
    }
    
    @Test
    public void testMultiplication() {
        assertEquals(20, 4 * 5, "Basic multiplication should work");
    }
    
    @Test
    public void testDivision() {
        assertEquals(5, 10 / 2, "Basic division should work");
    }
    
    @Test
    public void testStringNotNull() {
        String test = "L&T Connect";
        assertNotNull(test, "String should not be null");
    }
    
    @Test
    public void testStringEquals() {
        assertEquals("Test", "Test", "Strings should be equal");
    }
    
    @Test
    public void testBooleanTrue() {
        assertTrue(true, "Boolean should be true");
    }
    
    @Test
    public void testBooleanFalse() {
        assertFalse(false, "Boolean should be false");
    }
    
    @Test
    public void testArrayLength() {
        int[] arr = {1, 2, 3, 4, 5};
        assertEquals(5, arr.length, "Array length should be 5");
    }
    
    @Test
    public void testMaxValue() {
        assertEquals(10, Math.max(5, 10), "Max value should be 10");
    }
}
