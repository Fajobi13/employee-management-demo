# External Secrets (ESO)

ExternalSecret manifests for Vault integration using External Secrets Operator.

## Prerequisites

- External Secrets Operator installed
- ClusterSecretStore configured for Vault
- Vault secrets created at expected paths

## Vault Secret Paths

Each application has its own Vault path for least-privilege access:

| Application | Vault Path | Properties |
|-------------|------------|------------|
| MySQL | `secret/data/employee-app/mysql` | `root-password`, `username`, `password`, `database` |
| Backend | `secret/data/employee-app/backend` | `mysql-username`, `mysql-password` |
| Reports | `secret/data/employee-app/reports` | `mysql-username`, `mysql-password` |

## Vault Kubernetes Auth Configuration

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure Kubernetes auth (adjust API server URL)
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc"

# Create roles for each ServiceAccount
vault write auth/kubernetes/role/backend-role \
  bound_service_account_names=backend-sa \
  bound_service_account_namespaces=employee-app-backend \
  policies=employee-app-policy \
  ttl=1h

vault write auth/kubernetes/role/mysql-role \
  bound_service_account_names=mysql-sa \
  bound_service_account_namespaces=employee-app-db \
  policies=employee-app-policy \
  ttl=1h

vault write auth/kubernetes/role/reports-role \
  bound_service_account_names=reports-sa \
  bound_service_account_namespaces=employee-app-backend \
  policies=employee-app-policy \
  ttl=1h
```

## Setup Vault Secrets

```bash
# MySQL credentials (for MySQL pod)
vault kv put secret/employee-app/mysql \
  root-password="rootpass" \
  username="appuser" \
  password="apppass" \
  database="employeedb"

# Backend credentials
vault kv put secret/employee-app/backend \
  mysql-username="appuser" \
  mysql-password="apppass"

# Reports credentials (read-only user)
vault kv put secret/employee-app/reports \
  mysql-username="reports_reader" \
  mysql-password="reportspass"
```

## Vault Policy

```bash
# Create policy for employee-app secrets
vault policy write employee-app-policy - <<EOF
path "secret/data/employee-app/*" {
  capabilities = ["read"]
}
EOF
```

## Deployment

```bash
# Update secretStoreRef.name in each file to match your ClusterSecretStore
kubectl apply -f k8s/external-secrets/
```

## How It Works

1. ESO controller authenticates to Vault (using its own ServiceAccount)
2. ESO fetches secrets from configured Vault paths
3. ESO creates Kubernetes Secrets in target namespaces
4. Application pods read secrets via `secretKeyRef` (no Vault access needed)
