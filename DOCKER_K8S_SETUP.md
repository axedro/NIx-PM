# Docker & Kubernetes Setup Summary

This document provides a quick reference for the Docker and Kubernetes deployment setup for NIx PM.

## What's Included

### Docker Setup
- ✅ **Frontend Dockerfile** (`nix-pm/Dockerfile`): Multi-stage build with Nginx
- ✅ **Backend Dockerfile** (`nix-pm-backend/Dockerfile`): Multi-stage build with Node.js
- ✅ **Docker Compose** (`docker-compose.yml`): Full stack local development
- ✅ **Nginx Configuration** (`nix-pm/nginx.conf`): Production-ready web server config
- ✅ **.dockerignore files**: Optimized build contexts

### Kubernetes Setup
- ✅ **Namespace** (`k8s/namespace.yaml`): Isolated environment for NIx PM
- ✅ **ConfigMap** (`k8s/configmap.yaml`): Non-sensitive configuration
- ✅ **Secrets** (`k8s/secrets.yaml`): Sensitive credentials (template)
- ✅ **PostgreSQL Deployment** (`k8s/postgres-deployment.yaml`): Database with PVC
- ✅ **Backend Deployment** (`k8s/backend-deployment.yaml`): API service with health checks
- ✅ **Frontend Deployment** (`k8s/frontend-deployment.yaml`): Web UI with Nginx
- ✅ **Superset Deployment** (`k8s/superset-deployment.yaml`): BI platform
- ✅ **Ingress** (`k8s/ingress.yaml`): External access with TLS support

### Documentation
- ✅ **Deployment Guide** (`DEPLOYMENT.md`): Comprehensive deployment instructions
- ✅ **Environment Template** (`.env.example`): Configuration template

## Quick Start

### Local Development with Docker Compose

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment to Kubernetes

```bash
# 1. Build and push images
docker build -t your-registry/nix-pm-frontend:v1.0.0 ./nix-pm
docker build -t your-registry/nix-pm-backend:v1.0.0 ./nix-pm-backend
docker push your-registry/nix-pm-frontend:v1.0.0
docker push your-registry/nix-pm-backend:v1.0.0

# 2. Update image references in k8s/*.yaml files
sed -i 's|your-registry|gcr.io/your-project|g' k8s/*-deployment.yaml

# 3. Create secrets
kubectl create secret generic nix-pm-secrets \
  --from-literal=DB_PASSWORD=your-password \
  --from-literal=SMTP_PASSWORD=your-smtp-password \
  --namespace=nix-pm

# 4. Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/superset-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# 5. Verify deployment
kubectl get pods -n nix-pm
kubectl get svc -n nix-pm

# 6. Run migrations
BACKEND_POD=$(kubectl get pod -n nix-pm -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $BACKEND_POD -n nix-pm -- npm run migrate
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
│                  (Ingress / Service)                     │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Frontend │   │ Backend  │   │ Superset │
    │  (Nginx) │   │ (Node.js)│   │  (Flask) │
    │  Port 80 │   │ Port 3001│   │ Port 8088│
    └──────────┘   └──────────┘   └──────────┘
                           │               │
                           └───────┬───────┘
                                   │
                           ┌───────▼────────┐
                           │   PostgreSQL   │
                           │   Port 5432    │
                           └────────────────┘
```

## Key Features

### Docker
- Multi-stage builds for smaller image sizes
- Non-root user in production containers
- Health checks configured
- Volume mounts for persistence
- Network isolation with custom bridge

### Kubernetes
- Resource limits and requests defined
- Liveness and readiness probes
- Horizontal scaling ready (replicas: 2)
- Persistent volumes for databases
- ConfigMaps for configuration
- Secrets for sensitive data
- Ingress with TLS support
- Health check endpoints

## Service URLs

### Local (Docker Compose)
- Frontend: http://localhost
- Backend: http://localhost:3001
- Superset: http://localhost:8088
- PostgreSQL: localhost:5432

### Kubernetes (with Ingress)
- Frontend: https://nixpm.yourdomain.com
- Backend API: https://nixpm.yourdomain.com/api
- Superset: https://nixpm.yourdomain.com/superset

### Kubernetes (with Port Forward)
```bash
kubectl port-forward -n nix-pm svc/frontend-service 8080:80
kubectl port-forward -n nix-pm svc/backend-service 3001:3001
kubectl port-forward -n nix-pm svc/superset-service 8088:8088
```

## Environment Variables

Required environment variables (see `.env.example`):

**Database:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

**SMTP (Email Alerts):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

**Superset:**
- `SUPERSET_URL`, `SUPERSET_USERNAME`, `SUPERSET_PASSWORD`, `SUPERSET_SECRET_KEY`

## Cloud Provider Support

Kubernetes manifests are compatible with:
- ✅ Google Kubernetes Engine (GKE)
- ✅ Amazon Elastic Kubernetes Service (EKS)
- ✅ Azure Kubernetes Service (AKS)
- ✅ DigitalOcean Kubernetes
- ✅ Any standard Kubernetes 1.24+

See `DEPLOYMENT.md` for provider-specific setup instructions.

## Security Considerations

### Production Checklist
- [ ] Update all default passwords in secrets
- [ ] Enable HTTPS/TLS via Ingress
- [ ] Use managed database service (Cloud SQL, RDS, etc.)
- [ ] Implement network policies
- [ ] Enable pod security policies
- [ ] Use private container registry
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Test disaster recovery procedures

## Monitoring

Health check endpoints:
- Backend: `GET /health`
- Frontend: `GET /` (Nginx)

Prometheus metrics (if enabled):
- Pod metrics: CPU, memory, network
- Application metrics: request rate, errors, latency

## Troubleshooting

Common issues and solutions:

1. **Image pull errors**
   - Verify registry credentials
   - Check image names match your registry

2. **Database connection errors**
   - Verify secrets are created
   - Check PostgreSQL is running: `kubectl get pods -n nix-pm`

3. **Pod crashes**
   - Check logs: `kubectl logs -f pod/<pod-name> -n nix-pm`
   - Check resource limits

4. **Ingress not working**
   - Verify Ingress controller is installed
   - Check DNS records point to load balancer

## Next Steps

1. Review and customize `k8s/secrets.yaml` for production
2. Update `k8s/ingress.yaml` with your domain
3. Set up CI/CD pipeline (see `DEPLOYMENT.md`)
4. Configure monitoring and alerting
5. Set up automated backups
6. Review security hardening checklist

## Support

For detailed deployment instructions, see `DEPLOYMENT.md`.
For application documentation, see `README.md`.
