# Kubernetes Manifests

Raw Kubernetes manifests for deploying the Employee Management Application.

## Structure

```
k8s/
├── backend/           # Backend API service
│   ├── deployment.yaml
│   └── rbac.yaml      # ServiceAccount + Role + RoleBinding
├── frontend/          # Frontend static files
│   └── deployment.yaml
├── mysql/             # MySQL database
│   ├── deployment.yaml
│   ├── init-configmap.yaml
│   └── rbac.yaml
├── reports/           # Reports service (read-only)
│   ├── deployment.yaml
│   ├── rbac.yaml
│   ├── secret.yaml
│   ├── service.yaml
│   └── servicemonitor.yaml
├── external-secrets/  # ESO ExternalSecret manifests
├── network-policies.yaml
├── ingress.yaml
└── namespaces.yaml
```

## Deployment

```bash
# Create namespaces
kubectl apply -f k8s/namespaces.yaml

# Apply secrets first (or use ESO)
kubectl apply -f k8s/mysql/secret.yaml
kubectl apply -f k8s/reports/secret.yaml

# Apply RBAC
kubectl apply -f k8s/backend/rbac.yaml
kubectl apply -f k8s/reports/rbac.yaml
kubectl apply -f k8s/mysql/rbac.yaml

# Apply workloads
kubectl apply -f k8s/

# Apply network policies
kubectl apply -f k8s/network-policies.yaml
```

## Security

- Default deny network policies per namespace
- ServiceAccounts with scoped RBAC (can only read assigned secrets)
- `automountServiceAccountToken: false`
- Non-root containers with dropped capabilities
