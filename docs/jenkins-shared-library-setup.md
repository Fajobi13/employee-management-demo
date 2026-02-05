# Jenkins Shared Library: Security Scans

## Overview

This document describes how to set up a Jenkins Shared Library for enforcing security scans (Trivy and Conftest) across pipelines. The library is scoped at the **folder level** in Jenkins, so only pipelines within a designated folder inherit it. Pipelines outside the folder are unaffected.

## Architecture

```
Jenkins
├── kubernetes-apps/                    ← Folder with shared library configured
│   ├── employee-management-demo/       ← Inherits security scans automatically
│   ├── payment-service/                ← Inherits security scans automatically
│   └── notification-service/           ← Inherits security scans automatically
├── internal-tools/                     ← No shared library, no scans
└── batch-jobs/                         ← No shared library, no scans
```

## Prerequisites

- Jenkins 2.x with Pipeline plugin
- A Git repository for the shared library (e.g., `jenkins-shared-library`)
- Write access restricted to the @sd/DEVOPS team only

## Step 1: Create the Shared Library Repository

Create a new Git repository with the following structure:

```
jenkins-shared-library/
├── vars/
│   └── securityScans.groovy
└── README.md
```

### vars/securityScans.groovy

```groovy
def call(Map config = [:]) {
    def registry = config.registry ?: error('registry is required')
    def imageTag = config.imageTag ?: 'latest'
    def images = config.images ?: []
    def branch = env.BRANCH_NAME ?: ''

    stage('Security Scans') {
        parallel(
            'Trivy - Filesystem': {
                if (fileExists('pom.xml') || fileExists('package.json') ||
                    fileExists('backend/pom.xml') || fileExists('frontend/package.json')) {
                    sh 'trivy fs --exit-code 1 --severity HIGH,CRITICAL --format json --output trivy-fs-report.json .'
                } else {
                    echo 'No dependency files found, skipping filesystem scan'
                }
            },
            'Trivy - Image Scans': {
                if (branch == 'main' && images) {
                    images.each { image ->
                        def reportName = "trivy-${image.tokenize('/').last().split(':')[0]}-report.json"
                        sh "trivy image --exit-code 1 --severity CRITICAL --format json --output ${reportName} ${image}"
                    }
                } else {
                    echo 'Skipping image scans (not on main or no images specified)'
                }
            },
            'Conftest - K8s Manifests': {
                if (fileExists('k8s')) {
                    sh "conftest test k8s/ --policy ${config.k8sPolicy ?: 'policy/kubernetes'}"
                } else {
                    echo 'No k8s/ directory found, skipping K8s policy checks'
                }
            },
            'Conftest - Dockerfiles': {
                def dockerfiles = findFiles(glob: '**/Dockerfile')
                if (dockerfiles.length > 0) {
                    def files = dockerfiles.collect { it.path }.join(' ')
                    sh "conftest test --parser dockerfile ${files} --policy ${config.dockerfilePolicy ?: 'policy/dockerfile'}"
                } else {
                    echo 'No Dockerfiles found, skipping Dockerfile policy checks'
                }
            }
        )

        archiveArtifacts allowEmptyArchive: true, artifacts: 'trivy-*.json'
    }
}
```

## Step 2: Configure the Library on a Jenkins Folder

1. In Jenkins, create a folder (e.g., `kubernetes-apps`) or use an existing one
2. Go to **Folder > Configure > Pipeline Libraries**
3. Add a new library:
   - **Name**: `security-pipeline`
   - **Default version**: `main`
   - **Retrieval method**: Modern SCM > Git
   - **Project repository**: URL of the shared library repo
   - **Credentials**: Select the credential that has access to the repo
4. Check **Load implicitly** — this makes it available to all pipelines in the folder without needing `@Library` in the Jenkinsfile
5. Check **Allow default version to be overridden** — allows testing new versions on a per-pipeline basis if needed
6. Save

## Step 3: Use the Library in Pipelines

### Option A: Implicit loading (recommended)

If **Load implicitly** is enabled on the folder, pipelines just call the function directly. No `@Library` annotation needed:

```groovy
pipeline {
    agent any

    environment {
        REGISTRY  = 'ghcr.io/fajobi13/employee-management-demo'
        IMAGE_TAG = "${env.GIT_COMMIT?.take(7) ?: 'latest'}"
    }

    stages {
        stage('Lint & Test') {
            // ... existing lint and test stages
        }

        stage('Build & Push Images') {
            // ... existing build stages
        }

        stage('Security') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                securityScans(
                    registry: env.REGISTRY,
                    imageTag: env.IMAGE_TAG,
                    images: [
                        "${env.REGISTRY}/backend:${env.IMAGE_TAG}",
                        "${env.REGISTRY}/reports-service:${env.IMAGE_TAG}",
                        "${env.REGISTRY}/frontend:${env.IMAGE_TAG}"
                    ]
                )
            }
        }

        // ... deployment stages
    }
}
```

### Option B: Explicit loading

If **Load implicitly** is not enabled, pipelines must declare the library:

```groovy
@Library('security-pipeline') _

pipeline {
    // ... same as above
}
```

## Step 4: Move Pipelines into the Folder

Move all Kubernetes-deploying pipeline jobs into the `kubernetes-apps/` folder. Only these pipelines will inherit the shared library.

In Jenkins:
1. Go to the pipeline job
2. Click **Move** (or drag in the dashboard)
3. Select `kubernetes-apps/` as the destination

For Multibranch Pipelines, recreate them inside the folder or use the Job DSL plugin to automate this.

## How Scoping Works

| Pipeline location | Library loaded? | Scans enforced? |
|-------------------|----------------|-----------------|
| `kubernetes-apps/employee-management-demo` | Yes (folder-level) | Yes |
| `kubernetes-apps/payment-service` | Yes (folder-level) | Yes |
| `internal-tools/data-migration` | No | No |
| `batch-jobs/nightly-report` | No | No |

## Customisation

The shared library accepts the following parameters:

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `registry` | Yes | — | Container registry URL |
| `imageTag` | No | `latest` | Image tag to scan |
| `images` | No | `[]` | List of full image references to scan with Trivy |
| `k8sPolicy` | No | `policy/kubernetes` | Path to Kubernetes Rego policies |
| `dockerfilePolicy` | No | `policy/dockerfile` | Path to Dockerfile Rego policies |

## Access Control

| Repository | Who can write | Purpose |
|------------|---------------|---------|
| `jenkins-shared-library` | @sd/DEVOPS only | Security scan logic |
| `policy-repo` (Rego files) | @sd/DEVOPS | Policy rules |
| Application repos (Jenkinsfile) | Developers | Pipeline definition (cannot modify scan logic) |

## Testing Changes to the Library

1. Create a branch in the shared library repo
2. In a test pipeline, override the library version:
   ```groovy
   @Library('security-pipeline@feature-branch') _
   ```
3. Verify the changes work as expected
4. Merge to `main` — all pipelines in the folder pick up the update automatically

## Troubleshooting

### Scans not running on a pipeline

- Verify the pipeline is inside the folder that has the library configured
- Check the Jenkins console log for `securityScans` function calls
- Ensure **Load implicitly** is checked in the folder configuration

### Library not found error

- Verify the library name matches exactly (`security-pipeline`)
- Check that the Git credentials on the folder have read access to the library repo
- Confirm the default version (`main`) exists as a branch

### Scans skipping unexpectedly

- The library auto-detects what to scan based on files present in the repo
- Check that `Dockerfile`, `k8s/`, `pom.xml`, or `package.json` exist where expected
- Image scans only run on the `main` branch
