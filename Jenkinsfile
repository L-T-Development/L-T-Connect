pipeline {
    agent any
    
    tools {
        maven 'Maven 3.9'
        jdk 'Java 17'
    }
    
    environment {
        SONAR_TOKEN = credentials('sonar-token')
        // IMPORTANT: Replace these with YOUR actual values from SonarCloud
        SONAR_PROJECT_KEY = 'L-T-Development_L-T-Connect'  // ← CHANGE THIS
        SONAR_ORGANIZATION = 'l-t-development'              // ← CHANGE THIS
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }
    
    stages {
        stage('📥 Checkout') {
            steps {
                echo '========================================='
                echo "📥 Building Branch: ${env.BRANCH_NAME}"
                echo '========================================='
                checkout scm
                bat 'dir /s src'  // Show project structure
                echo '✅ Code checked out successfully'
            }
        }
        
        stage('☕ Verify Environment') {
            steps {
                echo '========================================='
                echo '☕ Verifying Build Environment'
                echo '========================================='
                bat 'java -version'
                bat 'mvn -version'
                echo '✅ Environment verified'
            }
        }
        
        stage('🏗️ Build - INTERNS') {
            when {
                branch 'interns'
            }
            steps {
                echo '========================================='
                echo '🏗️ INTERNS: Compiling Java Code'
                echo '========================================='
                bat 'mvn clean compile -DskipTests'
                echo '✅ Compilation successful!'
                echo ''
                echo '📌 Next Step: Create PR to dev branch'
            }
        }
        
        stage('🏗️ Build - DEV/MAIN') {
            when {
                anyOf {
                    branch 'dev'
                    branch 'main'
                }
            }
            steps {
                echo '========================================='
                echo '🏗️ FULL BUILD - Compiling Java Code'
                echo '========================================='
                bat 'mvn clean compile'
                echo '✅ Build successful!'
            }
        }
        
        stage('🔍 SonarQube Analysis - DEV/MAIN') {
            when {
                anyOf {
                    branch 'dev'
                    branch 'main'
                }
            }
            steps {
                echo '========================================='
                echo '🔍 RUNNING SONARQUBE CODE ANALYSIS'
                echo '========================================='
                
                withSonarQubeEnv('SonarCloud') {
                    bat """
                        mvn sonar:sonar ^
                        -Dsonar.projectKey=%SONAR_PROJECT_KEY% ^
                        -Dsonar.organization=%SONAR_ORGANIZATION% ^
                        -Dsonar.host.url=https://sonarcloud.io ^
                        -Dsonar.token=%SONAR_TOKEN%
                    """
                }
                
                echo ''
                echo '✅ SonarQube analysis completed'
                echo '📊 Check dashboard: https://sonarcloud.io'
            }
        }
        
        stage('✅ Quality Gate - DEV/MAIN') {
            when {
                anyOf {
                    branch 'dev'
                    branch 'main'
                }
            }
            steps {
                echo '========================================='
                echo '✅ WAITING FOR QUALITY GATE RESULT'
                echo '========================================='
                
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
                
                echo ''
                echo '✅ Quality Gate: PASSED'
            }
        }
        
        stage('🧪 Unit Tests - DEV/MAIN') {
            when {
                anyOf {
                    branch 'dev'
                    branch 'main'
                }
            }
            steps {
                echo '========================================='
                echo '🧪 RUNNING UNIT TESTS'
                echo '========================================='
                
                bat 'mvn test'
                
                echo ''
                echo '✅ All tests completed'
            }
            post {
                always {
                    junit '**/target/surefire-reports/*.xml'
                    echo '📊 Test results published'
                }
            }
        }
        
        stage('📊 Test Report - DEV/MAIN') {
            when {
                anyOf {
                    branch 'dev'
                    branch 'main'
                }
            }
            steps {
                echo '========================================='
                echo '📊 GENERATING TEST REPORTS'
                echo '========================================='
                
                script {
                    def testResults = junit '**/target/surefire-reports/*.xml'
                    echo "Total Tests: ${testResults.totalCount}"
                    echo "Passed: ${testResults.passCount}"
                    echo "Failed: ${testResults.failCount}"
                    echo "Skipped: ${testResults.skipCount}"
                }
            }
        }
    }
    
    post {
        success {
            script {
                if (env.BRANCH_NAME == 'interns') {
                    echo ''
                    echo '✅ ============================================ ✅'
                    echo '✅   INTERNS BRANCH: BUILD SUCCESSFUL        ✅'
                    echo '✅ ============================================ ✅'
                    echo ''
                    echo '📌 Code compiled successfully'
                    echo '📌 Ready to create Pull Request to dev'
                    echo ''
                } else if (env.BRANCH_NAME == 'dev') {
                    echo ''
                    echo '🎉 ============================================ 🎉'
                    echo '🎉     ALL CI/CD CHECKS PASSED - DEV         🎉'
                    echo '🎉 ============================================ 🎉'
                    echo ''
                    echo '✅ CHECK 1: Build             - PASSED ✓'
                    echo '✅ CHECK 2: SonarQube         - PASSED ✓'
                    echo '✅ CHECK 3: Quality Gate      - PASSED ✓'
                    echo '✅ CHECK 4: Unit Tests        - PASSED ✓'
                    echo ''
                    echo '📌 Code quality verified and stable'
                    echo ''
                } else if (env.BRANCH_NAME == 'main') {
                    echo ''
                    echo '🚀 ============================================ 🚀'
                    echo '🚀   PRODUCTION READY - ALL CHECKS PASSED    🚀'
                    echo '🚀 ============================================ 🚀'
                    echo ''
                    echo '✅ CHECK 1: Build             - PASSED ✓'
                    echo '✅ CHECK 2: SonarQube         - PASSED ✓'
                    echo '✅ CHECK 3: Quality Gate      - PASSED ✓'
                    echo '✅ CHECK 4: Unit Tests        - PASSED ✓'
                    echo ''
                    echo '🎉 Code is production-ready!'
                    echo ''
                }
            }
        }
        failure {
            echo ''
            echo '❌ ============================================ ❌'
            echo '❌          PIPELINE FAILED!                  ❌'
            echo '❌ ============================================ ❌'
            echo ''
            echo '⚠️  Please check the logs above for details'
            echo ''
        }
    }
}
