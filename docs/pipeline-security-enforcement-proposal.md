# CI/CD Pipeline Security Proposal

## 1. Introduction

This document proposes introducing automated security scanning into our CI/CD pipeline, followed by mechanisms to enforce those scans cannot be bypassed. It is structured in two parts:

- **Part A**: Why we need security scanning and what we propose to add
- **Part B**: How we enforce those scans so they cannot be removed or circumvented

---

## Part A: Introducing Security Scanning

### Current State

Our CI/CD pipeline currently builds, tests, and deploys three services (backend API, reports service, frontend) to Kubernetes. The pipeline validates code correctness through unit tests and linting but does not perform any security checks. Specifically:

- Container images are built and pushed to the registry without vulnerability scanning
- Kubernetes manifests are applied without policy validation
- Dockerfiles are not checked against security best practices
- There is no visibility into known CVEs in our dependencies or base images

### Risk Without Scanning

| Risk | Impact | Likelihood |
|------|--------|------------|
| Deploying images with known CRITICAL CVEs | Data breach, service compromise | High — new CVEs are published daily |
| Containers running as root | Privilege escalation if container is compromised | Medium — depends on Dockerfile practices |
| Missing resource limits in Kubernetes | Noisy neighbour problems, denial of service | Medium — easy to overlook |
| Privileged containers or host network access | Full node compromise | Low — but catastrophic if exploited |
| Secrets hardcoded in Dockerfiles or manifests | Credential exposure | Medium — common developer mistake |

### What We Propose to Add

We propose adding two categories of automated security checks to the pipeline:

#### 1. Vulnerability Scanning (Trivy)

[Trivy](https://github.com/aquasecurity/trivy) is an open-source vulnerability scanner maintained by Aqua Security. It scans container images and filesystems against the National Vulnerability Database (NVD).

**What it will scan:**

| Scan Type | Target | Severity Threshold | When |
|-----------|--------|--------------------|------|
| Filesystem scan | Source code dependencies (pom.xml, package.json) | HIGH and CRITICAL | Every build on main and develop |
| Image scan — Backend | `ghcr.io/.../backend:<sha>` | CRITICAL | After image build on main |
| Image scan — Reports | `ghcr.io/.../reports-service:<sha>` | CRITICAL | After image build on main |
| Image scan — Frontend | `ghcr.io/.../frontend:<sha>` | CRITICAL | After image build on main |

**What happens on failure:** The pipeline fails and the deployment is blocked. Developers must remediate the vulnerability (upgrade the dependency or base image) before the build can proceed.

**Output:** JSON reports archived as Jenkins build artifacts for audit and compliance purposes.

#### 2. Policy-as-Code (OPA Conftest)

[Conftest](https://www.conftest.dev/) uses Open Policy Agent (OPA) Rego policies to validate configuration files against security and operational best practices.

**What it will validate:**

| Target | Policies |
|--------|----------|
| Kubernetes manifests (`k8s/`) | Non-root containers, resource limits, no privileged mode, no host networking, required labels, restricted image registries |
| Dockerfiles (all services) | Non-root USER directive, no secrets in build args, approved base images, explicit package versions |

**What happens on failure:** The pipeline fails. The developer must update the manifest or Dockerfile to comply with the policy.

### Proposed Pipeline Stages

The security scans will be added as a new parallel stage after the image build, running on both `main` and `develop` branches:

```
Lint & Test (all branches)
    → Docker Login (main only)
    → Build & Push Images (main only)
    → Security Scans (main and develop)
        ├── Trivy Filesystem Scan
        ├── Trivy Image Scans (main only — images only exist on main)
        └── Conftest Policy Checks
    → Deploy to Dev → QA → UAT → Prod (main only)
```

### Cost and Maintenance

- **Trivy**: Free, open-source. Runs as a CLI command. Database updates are automatic.
- **Conftest**: Free, open-source. Policies are written in Rego and stored in the repository under `policy/`.
- **Pipeline overhead**: The scans run in parallel with each other. No sequential delay is added to the pipeline.
- **Ongoing maintenance**: Policies may need updating as new best practices emerge. Trivy database updates are automatic.

---

## Part B: Enforcing Security Scans

### Problem Statement

Once the scans described above are added to the pipeline, they will be defined in the application repository's Jenkinsfile. This means developers with write access could remove or bypass them. We need mechanisms to ensure that security scans cannot be circumvented.

### Risk Without Enforcement

- A developer removes the security scan stages from the Jenkinsfile and merges to main
- Vulnerable container images are built and deployed to production without scanning
- Non-compliant Kubernetes manifests (e.g., containers running as root, missing resource limits, privileged pods) are applied to production clusters
- Policy violations go undetected until a security audit or incident

### Proposed Enforcement Strategy

We recommend a defence-in-depth approach with four layers of enforcement. Each layer addresses a different attack vector.

### Layer 1: Branch Protection and Code Ownership

**What it does:** Prevents unauthorized changes to pipeline and policy files.

**Implementation steps:**

1. Create a `CODEOWNERS` file in the repository root:
   ```
   /Jenkinsfile               @sd/DEVOPS
   /policy/                   @sd/DEVOPS
   /.github/workflows/        @sd/DEVOPS
   /k8s/gatekeeper/           @sd/DEVOPS
   ```

2. Configure branch protection rules on `main`:
   - Require pull request reviews before merging (minimum 1 approval)
   - Require review from code owners
   - Require status checks to pass (CI pipeline must succeed)
   - Restrict who can push directly to `main`
   - Do not allow bypassing the above settings

**Coverage:** Prevents developers from silently modifying or removing security stages from the pipeline.

**Limitation:** Does not protect against someone deploying outside the pipeline (e.g., direct `kubectl apply`).

---

### Layer 2: Jenkins Shared Library

**What it does:** Centralizes security scan logic so individual repositories cannot modify or skip it.

**Implementation steps:**

1. Create a separate Git repository (e.g., `jenkins-shared-library`) owned by the platform team
2. Define the security scan stages as a shared library function:
   ```groovy
   // vars/securityScans.groovy
   def call(Map config) {
       stage('Security Scans') {
           parallel {
               stage('Trivy - Filesystem') { ... }
               stage('Trivy - Image Scans') { ... }
               stage('Conftest - Policies') { ... }
           }
       }
   }
   ```
3. Configure Jenkins to load this shared library globally (Manage Jenkins > Configure System > Global Pipeline Libraries)
4. Application Jenkinsfiles call the shared function:
   ```groovy
   @Library('security-pipeline') _
   securityScans(registry: env.REGISTRY, imageTag: env.IMAGE_TAG)
   ```
5. Restrict write access to the shared library repository to the platform team only

**Coverage:** Security stages cannot be removed from individual pipelines. Updates to scanning logic are applied across all repositories from a single location.

**Limitation:** Requires Jenkins as the CI/CD platform. Does not protect against out-of-band deployments.

---

### Layer 3: OPA Gatekeeper on Kubernetes Clusters

**What it does:** Rejects non-compliant resources at the cluster admission level, regardless of how they are deployed.

**Current state:** OPA Gatekeeper is already installed on our clusters. Constraint templates and constraints are defined in `k8s/gatekeeper/`. The remaining work is to review the existing constraints and switch enforcement from `dryrun` to `deny` in UAT and Prod.

**Implementation steps:**

1. Review and update the existing constraint templates in `k8s/gatekeeper/` to ensure coverage of the following policies:

   | Policy | Description |
   |--------|-------------|
   | Disallow privileged containers | Pods must not run in privileged mode |
   | Require non-root user | Containers must specify `runAsNonRoot: true` |
   | Require resource limits | All containers must define CPU and memory limits |
   | Restrict image registries | Only allow images from `ghcr.io/fajobi13/` |
   | Require labels | Deployments must have standard labels (app, version, team) |
   | Restrict host networking | Pods must not use host network or host ports |
   | Disallow latest tag | Image tags must be explicit (no `:latest` in production) |

2. Apply constraints with enforcement action per environment:

   | Environment | Enforcement |
   |-------------|-------------|
   | Dev | `deny` (block non-compliant resources) |
   | QA | `deny` (block non-compliant resources) |
   | UAT | `deny` (block non-compliant resources) |
   | Prod | `deny` (block non-compliant resources) |

3. Monitor Gatekeeper audit results:
   ```bash
   kubectl get constraints -o json | jq '.items[].status.totalViolations'
   ```

**Coverage:** Enforced at the cluster level. Even if the pipeline is bypassed entirely, non-compliant resources are rejected by the Kubernetes API server.

**Limitation:** Only validates Kubernetes manifests at deploy time. Does not scan container images for CVEs.

---

### Layer 4: Container Image Signing and Verification

**What it does:** Ensures only images that have passed security scans can be deployed.

**Implementation steps:**

1. Install Cosign on CI/CD agents
2. Generate a signing key pair, store the private key in HashiCorp Vault:
   ```bash
   cosign generate-key-pair
   ```
3. Add a signing step to the pipeline after security scans pass:
   ```groovy
   stage('Sign Images') {
       steps {
           sh "cosign sign --key cosign.key ${REGISTRY}/backend:${IMAGE_TAG}"
           sh "cosign sign --key cosign.key ${REGISTRY}/reports-service:${IMAGE_TAG}"
           sh "cosign sign --key cosign.key ${REGISTRY}/frontend:${IMAGE_TAG}"
       }
   }
   ```
4. Deploy Sigstore Policy Controller to the cluster:
   ```bash
   helm repo add sigstore https://sigstore.github.io/helm-charts
   helm install policy-controller sigstore/policy-controller -n sigstore-system --create-namespace
   ```
5. Create a `ClusterImagePolicy` that requires valid signatures:
   ```yaml
   apiVersion: policy.sigstore.dev/v1beta1
   kind: ClusterImagePolicy
   metadata:
     name: require-signed-images
   spec:
     images:
       - glob: "ghcr.io/fajobi13/**"
     authorities:
       - key:
           data: <cosign-public-key>
   ```

**Coverage:** Cryptographically guarantees that only images signed after passing security scans can run on the cluster. Prevents deploying unscanned or tampered images.

**Limitation:** Adds complexity to the pipeline and requires key management.

---

## Recommended Implementation Order

| Phase | Layer | Priority |
|-------|-------|----------|
| 1 | Branch protection + CODEOWNERS | High |
| 2 | OPA Gatekeeper enforcement on UAT/Prod | High |
| 3 | Jenkins Shared Library | Medium |
| 4 | Image signing with Cosign + Sigstore | Medium |

Phase 1 and 2 provide immediate coverage with minimal effort. Phase 3 and 4 add defence-in-depth and should be planned as follow-up work.

## Current State vs. Target State

| Capability | Current | Target |
|------------|---------|--------|
| Vulnerability scanning (Trivy) | In pipeline, can be removed | Enforced via shared library |
| Policy checks (Conftest) | In pipeline, can be removed | Enforced via shared library + Gatekeeper |
| Cluster admission control | Gatekeeper manifests exist but not enforced | Enforced (deny) in UAT and Prod |
| Image provenance | No signing | All production images signed and verified |
| Pipeline tamper protection | None | CODEOWNERS + branch protection |

## Resources Required

- Platform team time to implement Phases 1-4
- HashiCorp Vault access for Cosign key storage (Phase 4)
- Cluster admin access to deploy Gatekeeper constraints and Sigstore policy controller
- A dedicated Git repository for the Jenkins Shared Library (Phase 3)

## Appendix: Current Security Scanning Pipeline

The following stages are currently defined in the application Jenkinsfile:

- **Trivy filesystem scan**: Scans source code dependencies for HIGH and CRITICAL vulnerabilities
- **Trivy image scans**: Scans all three container images (backend, reports-service, frontend) for CRITICAL vulnerabilities
- **Conftest policy checks**: Validates Kubernetes manifests and Dockerfiles against OPA Rego policies covering security best practices
- **Scan results**: Trivy reports are archived as JSON build artifacts in Jenkins for audit purposes
