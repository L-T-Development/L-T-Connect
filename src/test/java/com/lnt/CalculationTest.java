package com.lnt;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculationTest {
    
    @Test
    public void testPercentageCalculation() {
        double result = (50.0 / 100.0) * 200;
        assertEquals(100.0, result, "Percentage calculation should work");
    }
    
    @Test
    public void testAreaOfRectangle() {
        int length = 10;
        int width = 5;
        assertEquals(50, length * width, "Area calculation should be correct");
    }
    
    @Test
    public void testModulus() {
        assertEquals(1, 10 % 3, "Modulus should work correctly");
    }
    
    @Test
    public void testMinValue() {
        assertEquals(5, Math.min(5, 10), "Min value should be 5");
    }
    
    @Test
    public void testAbsoluteValue() {
        assertEquals(5, Math.abs(-5), "Absolute value should be positive");
    }
}
