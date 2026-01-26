# Kustomize

Kustomize overlays for environment-specific deployments.

## Structure

```
k8s/
└── kustomization.yaml       # Base - references all k8s manifests

kustomize/
└── overlays/
    ├── dev/                 # 1 replica, DEBUG logging
    ├── staging/             # 2 replicas, INFO logging
    └── prod/                # 3 replicas, ESO enabled, WARN logging
```

## Usage

```bash
# Preview generated manifests
kubectl kustomize kustomize/overlays/dev

# Apply to cluster
kubectl apply -k kustomize/overlays/dev
kubectl apply -k kustomize/overlays/staging
kubectl apply -k kustomize/overlays/prod
```

## Environment Differences

| Setting | Dev | Staging | Prod |
|---------|-----|---------|------|
| Replicas (backend/frontend) | 1 | 2 | 3 |
| Log Level | DEBUG | INFO | WARN |
| Secrets | Static | Static | ESO/Vault |
| Name Prefix | dev- | staging- | prod- |

## Prod with ESO

Production overlay includes ExternalSecrets and removes static secrets:
- ESO fetches credentials from Vault
- Static K8s Secrets are deleted (ESO creates them)

## Relationship with k8s/

- `k8s/kustomization.yaml` serves as the base (no duplication)
- `k8s/` can still be used directly for simple deployments
- Overlays reference `../../../k8s` and add environment-specific customization
- Prod overlay includes local copies of ExternalSecret manifests
