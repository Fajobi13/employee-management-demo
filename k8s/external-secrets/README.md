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

## Vault Authentication for ESO

ESO authenticates to Vault via ClusterSecretStore (not via app ServiceAccounts).

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc"

# Create role for ESO controller ServiceAccount
vault write auth/kubernetes/role/external-secrets-role \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=employee-app-policy \
  ttl=1h
```

Example ClusterSecretStore:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "http://vault.vault.svc:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets-role"
          serviceAccountRef:
            name: "external-secrets"
            namespace: "external-secrets"
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
