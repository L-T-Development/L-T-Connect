package com.lnt.security;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.zaproxy.clientapi.core.ApiResponse;
import org.zaproxy.clientapi.core.ClientApi;
import org.zaproxy.clientapi.core.ClientApiException;

import static org.junit.jupiter.api.Assertions.*;

public class VAPTTest {
    private static final String ZAP_ADDRESS = "localhost";
    private static final int ZAP_PORT = 8090;
    private static final String TARGET_URL = "http://localhost:3000";
    private static ClientApi api;
    
    @BeforeAll
    public static void setUp() throws ClientApiException {
        api = new ClientApi(ZAP_ADDRESS, ZAP_PORT);
        System.out.println("✅ Connected to OWASP ZAP");
    }
    
    @Test
    public void testSpiderScan() throws ClientApiException, InterruptedException {
        System.out.println("🕷️ Starting Spider Scan...");
        
        // Start spider scan
        ApiResponse resp = api.spider.scan(TARGET_URL, null, null, null, null);
        String scanId = ((ApiResponseElement) resp).getValue();
        
        // Wait for spider to complete
        int progress = 0;
        while (progress < 100) {
            Thread.sleep(1000);
            progress = Integer.parseInt(
                ((ApiResponseElement) api.spider.status(scanId)).getValue()
            );
            System.out.println("Spider progress: " + progress + "%");
        }
        
        System.out.println("✅ Spider Scan Complete");
    }
    
    @Test
    public void testActiveScan() throws ClientApiException, InterruptedException {
        System.out.println("🔍 Starting Active Scan...");
        
        // Start active scan
        ApiResponse resp = api.ascan.scan(TARGET_URL, "True", "False", null, null, null);
        String scanId = ((ApiResponseElement) resp).getValue();
        
        // Wait for scan to complete
        int progress = 0;
        while (progress < 100) {
            Thread.sleep(5000);
            progress = Integer.parseInt(
                ((ApiResponseElement) api.ascan.status(scanId)).getValue()
            );
            System.out.println("Active Scan progress: " + progress + "%");
        }
        
        System.out.println("✅ Active Scan Complete");
    }
    
    @Test
    public void testVulnerabilityAssessment() throws ClientApiException {
        System.out.println("📊 Generating Vulnerability Report...");
        
        // Get alerts
        ApiResponse alerts = api.core.alerts(TARGET_URL, null, null);
        
        int highRisk = 0, mediumRisk = 0, lowRisk = 0;
        
        // Count vulnerabilities by risk level
        ApiResponseList alertsList = (ApiResponseList) alerts;
        for (ApiResponse alert : alertsList.getItems()) {
            String risk = ((ApiResponseSet) alert).getAttribute("risk");
            if ("High".equals(risk)) highRisk++;
            else if ("Medium".equals(risk)) mediumRisk++;
            else if ("Low".equals(risk)) lowRisk++;
        }
        
        System.out.println("🔴 High Risk: " + highRisk);
        System.out.println("🟡 Medium Risk: " + mediumRisk);
        System.out.println("🟢 Low Risk: " + lowRisk);
        
        // Fail build if high risk vulnerabilities found
        assertEquals(0, highRisk, "High risk vulnerabilities detected!");
    }
    
    @AfterAll
    public static void tearDown() throws ClientApiException {
        // Generate HTML report
        String report = new String(api.core.htmlreport());
        // Save report (implementation depends on your setup)
        System.out.println("📄 Security Report Generated");
    }
}
