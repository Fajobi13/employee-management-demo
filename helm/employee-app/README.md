# Employee App Helm Chart

Helm chart for deploying the Employee Management Application to Kubernetes.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.0+
- Envoy Gateway (for ingress)
- External Secrets Operator (optional, for Vault integration)

## Installation

```bash
# Basic install (development)
helm install employee-app ./helm/employee-app \
  --set mysql.auth.rootPassword=changeme \
  --set mysql.auth.password=changeme \
  --set mysql.auth.reportsPassword=changeme

# Production with ESO/Vault
helm install employee-app ./helm/employee-app \
  --set externalSecrets.enabled=true \
  --set externalSecrets.secretStoreRef.name=vault-backend
```

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `mysql.auth.rootPassword` | MySQL root password (required) | `""` |
| `mysql.auth.password` | App user password (required) | `""` |
| `mysql.auth.reportsPassword` | Reports user password (required) | `""` |
| `externalSecrets.enabled` | Use ESO for secrets | `false` |
| `serviceAccount.create` | Create ServiceAccounts | `false` |
| `networkPolicies.enabled` | Enable network policies | `true` |

## Security Features

- Default deny network policies
- RBAC with least-privilege secret access
- Pod Security Standards (restricted/baseline)
- Non-root containers
- Dropped capabilities
- Seccomp profiles

## Vault Integration (ESO)

Secrets are stored at separate paths per application:
- `secret/data/employee-app/mysql` - MySQL root credentials
- `secret/data/employee-app/backend` - Backend DB credentials
- `secret/data/employee-app/reports` - Reports read-only credentials
