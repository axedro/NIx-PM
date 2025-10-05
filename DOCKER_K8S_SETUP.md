# Docker & Kubernetes Setup Summary

This document provides a quick reference for the Docker and Kubernetes deployment setup for NIx PM.

## What's Included

### Docker Setup
- ✅ **Frontend Dockerfile** (`nix-pm/Dockerfile`): Multi-stage build with Nginx
- ✅ **Backend Dockerfile** (`nix-pm-backend/Dockerfile`): Multi-stage build with Node.js
- ✅ **Docker Compose** (`docker-compose.yml`): Frontend and Backend services
- ✅ **Nginx Configuration** (`nix-pm/nginx.conf`): Production-ready web server config
- ✅ **.dockerignore files**: Optimized build contexts

### Kubernetes Setup
- ✅ **Namespace** (`k8s/namespace.yaml`): Isolated environment for NIx PM
- ✅ **ConfigMap** (`k8s/configmap.yaml`): Non-sensitive configuration
- ✅ **Secrets** (`k8s/secrets.yaml`): Sensitive credentials (template)
- ✅ **Backend Deployment** (`k8s/backend-deployment.yaml`): API service with health checks
- ✅ **Frontend Deployment** (`k8s/frontend-deployment.yaml`): Web UI with Nginx
- ✅ **Ingress** (`k8s/ingress.yaml`): External access with TLS support

### Documentation
- ✅ **Deployment Guide** (`DEPLOYMENT.md`): Comprehensive deployment instructions
- ✅ **Environment Template** (`.env.example`): Configuration template

## External Dependencies

NIx PM requires the following external services:

### PostgreSQL Database
- Required for storing alerts, notifications, and dataset configurations
- Must be accessible from the deployed backend service
- Configure connection details in environment variables

### Apache Superset
- Required for dashboards and chart visualization
- Must be accessible from both frontend (user browsers) and backend service
- Configure URL and credentials in environment variables

## Quick Start

### Local Development with Docker Compose

```bash
# Copy environment template
cp .env.example .env

# Edit configuration with your external services
nano .env
# Update:
# - DB_HOST: Your PostgreSQL host
# - DB_NAME, DB_USER, DB_PASSWORD: PostgreSQL credentials
# - SUPERSET_URL: Your Superset instance URL
# - SUPERSET_USERNAME, SUPERSET_PASSWORD: Superset credentials

# Start services
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

# 3. Update ConfigMap with your external service endpoints
# Edit k8s/configmap.yaml:
# - DB_HOST: Your PostgreSQL host
# - SUPERSET_URL: Your Superset instance URL

# 4. Create secrets with your credentials
kubectl create secret generic nix-pm-secrets \
  --from-literal=DB_USER=postgres \
  --from-literal=DB_PASSWORD=your-db-password \
  --from-literal=SMTP_USER=your-email@gmail.com \
  --from-literal=SMTP_PASSWORD=your-smtp-password \
  --from-literal=SUPERSET_PASSWORD=your-superset-password \
  --namespace=nix-pm

# 5. Deploy to Kubernetes
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml

# 6. Verify deployment
kubectl get pods -n nix-pm
kubectl get svc -n nix-pm

# 7. Run migrations (ensure DB_HOST is accessible)
BACKEND_POD=$(kubectl get pod -n nix-pm -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $BACKEND_POD -n nix-pm -- npm run migrate
```

## Architecture Overview

```
                     External Services
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   PostgreSQL         Superset          SMTP Server
   (External)         (External)        (External)
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
┌──────────────────────────┼──────────────────────┐
│              Load Balancer (Ingress)            │
└──────────────────────────┼──────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼
    ┌──────────┐   ┌──────────┐
    │ Frontend │   │ Backend  │
    │  (Nginx) │   │ (Node.js)│
    │  Port 80 │   │ Port 3001│
    └──────────┘   └──────────┘
```

## Key Features

### Docker
- Multi-stage builds for smaller image sizes
- Non-root user in production containers
- Health checks configured
- Network isolation with custom bridge
- External service connections via environment variables

### Kubernetes
- Resource limits and requests defined
- Liveness and readiness probes
- Horizontal scaling ready (replicas: 2)
- ConfigMaps for configuration
- Secrets for sensitive data
- Ingress with TLS support
- Health check endpoints
- External service connectivity

## Service URLs

### Local (Docker Compose)
- Frontend: http://localhost
- Backend: http://localhost:3001
- PostgreSQL: External (configured in .env)
- Superset: External (configured in .env)

### Kubernetes (with Ingress)
- Frontend: https://nixpm.yourdomain.com
- Backend API: https://nixpm.yourdomain.com/api
- PostgreSQL: External (configured in ConfigMap)
- Superset: External (configured in ConfigMap)

### Kubernetes (with Port Forward)
```bash
kubectl port-forward -n nix-pm svc/frontend-service 8080:80
kubectl port-forward -n nix-pm svc/backend-service 3001:3001
```

## Environment Variables

Required environment variables (see `.env.example`):

**External PostgreSQL Database:**
- `DB_HOST` - PostgreSQL host address
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

**External Superset:**
- `SUPERSET_URL` - Superset instance URL
- `SUPERSET_USERNAME` - Superset username
- `SUPERSET_PASSWORD` - Superset password

**SMTP (Email Alerts):**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

## Cloud Provider Support

Kubernetes manifests are compatible with:
- ✅ Google Kubernetes Engine (GKE)
- ✅ Amazon Elastic Kubernetes Service (EKS)
- ✅ Azure Kubernetes Service (AKS)
- ✅ DigitalOcean Kubernetes
- ✅ Any standard Kubernetes 1.24+

See `DEPLOYMENT.md` for provider-specific setup instructions.

## Network Requirements

### Backend Service Needs Access To:
- PostgreSQL database (port 5432)
- Superset API (port 8088 or HTTPS)
- SMTP server (port 587 or 465)

### Frontend Service Needs:
- Backend service (internal networking)

### User Browsers Need Access To:
- Frontend service (via Ingress or LoadBalancer)
- Superset instance (for embedded dashboards/charts)

### Firewall / Security Group Rules:
- Allow backend → PostgreSQL (port 5432)
- Allow backend → Superset (port 8088/443)
- Allow backend → SMTP (port 587/465)
- Allow users → Superset (port 8088/443) for iframe embedding
- Allow users → Ingress (port 80/443)

## Security Considerations

### Production Checklist
- [ ] Update all default passwords in secrets
- [ ] Enable HTTPS/TLS via Ingress
- [ ] Secure PostgreSQL connection (SSL/TLS)
- [ ] Use VPN or private network for database access
- [ ] Implement network policies
- [ ] Enable pod security policies
- [ ] Use private container registry
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups for external database
- [ ] Test disaster recovery procedures
- [ ] Configure Superset CORS for your domain

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
   - Verify external PostgreSQL is accessible
   - Check network connectivity from pods
   - Verify credentials in secrets
   - Check firewall rules

3. **Superset connection errors**
   - Verify SUPERSET_URL is accessible from backend
   - Verify SUPERSET_URL is accessible from user browsers (CORS)
   - Check Superset credentials

4. **Pod crashes**
   - Check logs: `kubectl logs -f pod/<pod-name> -n nix-pm`
   - Check resource limits

5. **Ingress not working**
   - Verify Ingress controller is installed
   - Check DNS records point to load balancer

## Next Steps

1. Set up external PostgreSQL database
2. Configure external Superset instance with CORS
3. Update `k8s/configmap.yaml` with external service endpoints
4. Update `k8s/secrets.yaml` with credentials
5. Update `k8s/ingress.yaml` with your domain
6. Set up CI/CD pipeline (see `DEPLOYMENT.md`)
7. Configure monitoring and alerting
8. Review security hardening checklist

## Support

For detailed deployment instructions, see `DEPLOYMENT.md`.
For application documentation, see `README.md`.
