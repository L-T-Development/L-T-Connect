pipeline {
    agent any
    
    tools {
        maven 'Maven'  // ← This tells Jenkins to use the auto-installed Maven
    }
    
    environment {
        JAVA_HOME = '/opt/java/openjdk'
        PATH = "${JAVA_HOME}/bin:${env.PATH}"
        
        SONAR_TOKEN = credentials('sonar-token')
        SONAR_PROJECT_KEY = 'l-t-development_l-t-connect'
        SONAR_ORGANIZATION = 'l-t-development'
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
                sh 'ls -la'
                echo '✅ Code checked out successfully'
            }
        }
        
        stage('☕ Verify Environment') {
            steps {
                echo '========================================='
                echo '☕ Verifying Build Environment'
                echo '========================================='
                sh 'echo "JAVA_HOME: $JAVA_HOME"'
                sh 'java -version'
                sh 'mvn -version'
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
                sh 'mvn clean compile -DskipTests'
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
                sh 'mvn clean compile'
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
                    sh """
                        mvn sonar:sonar \
                        -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                        -Dsonar.organization=${SONAR_ORGANIZATION} \
                        -Dsonar.host.url=https://sonarcloud.io \
                        -Dsonar.token=${SONAR_TOKEN}
                    """
                }
                
                echo '✅ SonarQube analysis completed'
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
                
                sh 'mvn test'
                
                echo '✅ All tests completed'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml'
                    echo '📊 Test results published'
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
                } else if (env.BRANCH_NAME == 'main') {
                    echo ''
                    echo '🚀 ============================================ 🚀'
                    echo '🚀   PRODUCTION READY - ALL CHECKS PASSED    🚀'
                    echo '🚀 ============================================ 🚀'
                    echo ''
                    echo '✅ ALL CHECKS PASSED'
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
        }
    }
}
