pipeline {
    agent any

    tools {
        maven 'Maven-3.9'
        jdk 'JDK-21'
        nodejs 'Node-20'
    }

    environment {
        REGISTRY      = 'ghcr.io/fajobi13/employee-management-demo'
        IMAGE_TAG     = "${env.GIT_COMMIT?.take(7) ?: 'latest'}"
        KUBECONFIG    = credentials('kubeconfig')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Lint & Test') {
            parallel {
                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm run lint'
                            sh 'npm run test:run'
                        }
                    }
                }
                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh 'mvn verify -B'
                        }
                    }
                }
                stage('Reports Service') {
                    steps {
                        dir('reports-service') {
                            sh 'mvn verify -B'
                        }
                    }
                }
            }
        }

        stage('Docker Login') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'ghcr-credentials',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_PASS'
                )]) {
                    sh 'echo $REGISTRY_PASS | docker login ghcr.io -u $REGISTRY_USER --password-stdin'
                }
            }
        }

        stage('Build & Push Images') {
            when {
                branch 'main'
            }
            parallel {
                stage('Frontend Image') {
                    steps {
                        dir('frontend') {
                            sh """
                                docker build -t ${REGISTRY}/frontend:${IMAGE_TAG} -t ${REGISTRY}/frontend:latest .
                                docker push ${REGISTRY}/frontend:${IMAGE_TAG}
                                docker push ${REGISTRY}/frontend:latest
                            """
                        }
                    }
                }
                stage('Backend Image') {
                    steps {
                        dir('backend') {
                            sh """
                                docker build -t ${REGISTRY}/backend:${IMAGE_TAG} -t ${REGISTRY}/backend:latest .
                                docker push ${REGISTRY}/backend:${IMAGE_TAG}
                                docker push ${REGISTRY}/backend:latest
                            """
                        }
                    }
                }
                stage('Reports Image') {
                    steps {
                        dir('reports-service') {
                            sh """
                                docker build -t ${REGISTRY}/reports-service:${IMAGE_TAG} -t ${REGISTRY}/reports-service:latest .
                                docker push ${REGISTRY}/reports-service:${IMAGE_TAG}
                                docker push ${REGISTRY}/reports-service:latest
                            """
                        }
                    }
                }
            }
        }

        stage('Security Scans') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            parallel {
                stage('Trivy - Filesystem') {
                    steps {
                        sh 'trivy fs --exit-code 1 --severity HIGH,CRITICAL --format json --output trivy-fs-report.json .'
                    }
                }
                stage('Trivy - Frontend Image') {
                    when {
                        branch 'main'
                    }
                    steps {
                        sh "trivy image --exit-code 1 --severity CRITICAL --format json --output trivy-frontend-report.json ${REGISTRY}/frontend:${IMAGE_TAG}"
                    }
                }
                stage('Trivy - Backend Image') {
                    when {
                        branch 'main'
                    }
                    steps {
                        sh "trivy image --exit-code 1 --severity CRITICAL --format json --output trivy-backend-report.json ${REGISTRY}/backend:${IMAGE_TAG}"
                    }
                }
                stage('Trivy - Reports Image') {
                    when {
                        branch 'main'
                    }
                    steps {
                        sh "trivy image --exit-code 1 --severity CRITICAL --format json --output trivy-reports-report.json ${REGISTRY}/reports-service:${IMAGE_TAG}"
                    }
                }
                stage('Conftest - Policies') {
                    steps {
                        sh 'conftest test k8s/ --policy policy/kubernetes'
                        sh 'conftest test --parser dockerfile backend/Dockerfile reports-service/Dockerfile frontend/Dockerfile --policy policy/dockerfile'
                    }
                }
            }
        }

        stage('Deploy to Dev') {
            when {
                branch 'main'
            }
            steps {
                deployWithKustomize('dev')
            }
        }

        stage('Deploy to QA') {
            when {
                branch 'main'
            }
            steps {
                deployWithKustomize('qa')
            }
        }

        stage('Deploy to UAT') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Approve deployment to UAT?', submitter: 'platform-team'
                deployWithKustomize('uat')
            }
        }

        stage('Deploy to Prod') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Approve deployment to Production?', submitter: 'platform-team'
                deployWithKustomize('prod')
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml'
            archiveArtifacts allowEmptyArchive: true, artifacts: 'trivy-*.json'
            sh 'docker logout ghcr.io || true'
            cleanWs()
        }
        failure {
            echo "Pipeline failed on branch: ${env.BRANCH_NAME}"
        }
    }
}

def deployWithKustomize(String environment) {
    sh """
        cd kustomize/overlays/${environment}

        kustomize edit set image \
            ${REGISTRY}/backend:${IMAGE_TAG} \
            ${REGISTRY}/reports-service:${IMAGE_TAG} \
            ${REGISTRY}/frontend:${IMAGE_TAG}

        kustomize build . | kubectl apply -f -

        kubectl rollout status deployment/backend -n employee-${environment} --timeout=120s
        kubectl rollout status deployment/reports-service -n employee-${environment} --timeout=120s
        kubectl rollout status deployment/frontend -n employee-${environment} --timeout=120s
    """
}
