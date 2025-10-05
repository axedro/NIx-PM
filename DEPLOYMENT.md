# NIx PM Deployment Guide

This guide covers deploying NIx PM using Docker and Kubernetes.

## Table of Contents

1. [Docker Deployment](#docker-deployment)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Cloud Provider Setup](#cloud-provider-setup)
4. [Production Considerations](#production-considerations)

---

## Docker Deployment

### Prerequisites

- Docker installed (20.10+)
- Docker Compose installed (2.0+)

### Quick Start with Docker Compose

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd PM
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   nano .env
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Check service status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

5. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost:3001
   - Superset: http://localhost:8088

### Build and Push Docker Images

For deployment to cloud, you need to build and push images to a container registry:

```bash
# Build frontend
cd nix-pm
docker build -t your-registry/nix-pm-frontend:v1.0.0 .
docker push your-registry/nix-pm-frontend:v1.0.0

# Build backend
cd ../nix-pm-backend
docker build -t your-registry/nix-pm-backend:v1.0.0 .
docker push your-registry/nix-pm-backend:v1.0.0
```

**Supported Registries:**
- Docker Hub: `docker.io/username/image:tag`
- Google Container Registry: `gcr.io/project-id/image:tag`
- AWS ECR: `account-id.dkr.ecr.region.amazonaws.com/image:tag`
- Azure Container Registry: `registry.azurecr.io/image:tag`

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Container registry with your images
- (Optional) cert-manager for SSL certificates

### Step 1: Update Image References

Edit the deployment files to reference your container registry:

```bash
# Update backend deployment
sed -i 's|your-registry|gcr.io/your-project|g' k8s/backend-deployment.yaml

# Update frontend deployment
sed -i 's|your-registry|gcr.io/your-project|g' k8s/frontend-deployment.yaml
```

### Step 2: Configure Secrets

**Important:** Never commit secrets to version control!

```bash
# Edit secrets file with real credentials
cp k8s/secrets.yaml k8s/secrets-prod.yaml
nano k8s/secrets-prod.yaml

# Or create secrets directly in Kubernetes
kubectl create secret generic nix-pm-secrets \
  --from-literal=DB_USER=postgres \
  --from-literal=DB_PASSWORD=your-secure-password \
  --from-literal=SMTP_USER=your-email@gmail.com \
  --from-literal=SMTP_PASSWORD=your-app-password \
  --from-literal=SUPERSET_PASSWORD=admin \
  --from-literal=SUPERSET_SECRET_KEY=your-secret-key \
  --namespace=nix-pm

kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=your-secure-password \
  --from-literal=POSTGRES_DB=nixpm \
  --namespace=nix-pm
```

### Step 3: Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create ConfigMaps and Secrets (if using files)
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets-prod.yaml  # Use your edited version

# Deploy PostgreSQL
kubectl apply -f k8s/postgres-deployment.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n nix-pm --timeout=300s

# Deploy Backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy Frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy Superset
kubectl apply -f k8s/superset-deployment.yaml

# (Optional) Deploy Ingress
kubectl apply -f k8s/ingress.yaml
```

### Step 4: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n nix-pm

# Check services
kubectl get svc -n nix-pm

# Check logs
kubectl logs -f deployment/backend -n nix-pm
kubectl logs -f deployment/frontend -n nix-pm
kubectl logs -f deployment/superset -n nix-pm
kubectl logs -f deployment/postgres -n nix-pm
```

### Step 5: Run Database Migrations

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pod -n nix-pm -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it $BACKEND_POD -n nix-pm -- npm run migrate
```

### Step 6: Access the Application

**Without Ingress (using port-forward):**
```bash
# Frontend
kubectl port-forward -n nix-pm svc/frontend-service 8080:80

# Backend API
kubectl port-forward -n nix-pm svc/backend-service 3001:3001

# Superset
kubectl port-forward -n nix-pm svc/superset-service 8088:8088
```

**With Ingress:**
- Update `k8s/ingress.yaml` with your domain
- Install NGINX Ingress Controller (if not already installed)
- Install cert-manager for SSL certificates
- Access via: https://nixpm.yourdomain.com

---

## Cloud Provider Setup

### Google Kubernetes Engine (GKE)

```bash
# Create GKE cluster
gcloud container clusters create nix-pm-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=5

# Get credentials
gcloud container clusters get-credentials nix-pm-cluster --zone=us-central1-a

# Push images to GCR
docker tag nix-pm-frontend:latest gcr.io/your-project/nix-pm-frontend:latest
docker push gcr.io/your-project/nix-pm-frontend:latest

docker tag nix-pm-backend:latest gcr.io/your-project/nix-pm-backend:latest
docker push gcr.io/your-project/nix-pm-backend:latest

# Continue with Kubernetes deployment steps above
```

### Amazon EKS

```bash
# Create EKS cluster
eksctl create cluster \
  --name nix-pm-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5

# Get credentials
aws eks update-kubeconfig --name nix-pm-cluster --region us-east-1

# Push images to ECR
aws ecr create-repository --repository-name nix-pm-frontend
aws ecr create-repository --repository-name nix-pm-backend

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag nix-pm-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nix-pm-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nix-pm-frontend:latest

docker tag nix-pm-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nix-pm-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/nix-pm-backend:latest

# Continue with Kubernetes deployment steps above
```

### Azure Kubernetes Service (AKS)

```bash
# Create resource group
az group create --name nix-pm-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group nix-pm-rg \
  --name nix-pm-cluster \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group nix-pm-rg --name nix-pm-cluster

# Create ACR
az acr create --resource-group nix-pm-rg --name nixpmacr --sku Basic

# Login to ACR
az acr login --name nixpmacr

# Attach ACR to AKS
az aks update -n nix-pm-cluster -g nix-pm-rg --attach-acr nixpmacr

# Tag and push
docker tag nix-pm-frontend:latest nixpmacr.azurecr.io/nix-pm-frontend:latest
docker push nixpmacr.azurecr.io/nix-pm-frontend:latest

docker tag nix-pm-backend:latest nixpmacr.azurecr.io/nix-pm-backend:latest
docker push nixpmacr.azurecr.io/nix-pm-backend:latest

# Continue with Kubernetes deployment steps above
```

---

## Production Considerations

### Security

1. **Secrets Management**
   - Use Kubernetes Secrets or external secret managers (AWS Secrets Manager, Google Secret Manager, Azure Key Vault)
   - Enable encryption at rest for Kubernetes secrets
   - Rotate secrets regularly

2. **Network Security**
   - Use Network Policies to restrict pod-to-pod communication
   - Enable TLS/SSL for all external endpoints
   - Use private subnets for databases

3. **Authentication & Authorization**
   - Enable RBAC in Kubernetes
   - Use service accounts with minimal permissions
   - Implement API authentication (OAuth, JWT)

### High Availability

1. **Database**
   - Use managed database services (Cloud SQL, RDS, Azure Database)
   - Enable automatic backups
   - Configure read replicas for scaling

2. **Application**
   - Run multiple replicas (min 2 per service)
   - Configure Pod Disruption Budgets
   - Use horizontal pod autoscaling

3. **Storage**
   - Use persistent volumes with replication
   - Configure regular backups
   - Test restore procedures

### Monitoring & Logging

1. **Install Monitoring Stack**
   ```bash
   # Prometheus & Grafana
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
   ```

2. **Application Logs**
   ```bash
   # View logs
   kubectl logs -f deployment/backend -n nix-pm
   kubectl logs -f deployment/frontend -n nix-pm

   # Or use centralized logging (ELK, Loki, CloudWatch)
   ```

3. **Health Checks**
   - Backend health endpoint: `/health`
   - Monitor pod restarts: `kubectl get pods -n nix-pm -w`

### Performance

1. **Resource Limits**
   - Set appropriate CPU/memory requests and limits
   - Monitor resource usage with metrics
   - Adjust based on actual usage

2. **Caching**
   - Enable nginx caching for static assets
   - Use CDN for frontend distribution
   - Implement application-level caching

3. **Database Optimization**
   - Create appropriate indexes
   - Use connection pooling
   - Monitor slow queries

### Backup & Disaster Recovery

1. **Database Backups**
   ```bash
   # Manual backup
   kubectl exec -n nix-pm deployment/postgres -- pg_dump -U postgres nixpm > backup.sql

   # Automated backups (use managed database service)
   ```

2. **Application State**
   - Version control all configurations
   - Document deployment procedures
   - Test disaster recovery procedures

### Cost Optimization

1. **Right-sizing**
   - Monitor actual resource usage
   - Use smaller instance types where appropriate
   - Enable cluster autoscaling

2. **Storage**
   - Use appropriate storage classes
   - Clean up old PVCs
   - Use lifecycle policies for backups

3. **Development Environments**
   - Use smaller clusters for dev/staging
   - Scale down or stop non-production environments when not in use

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and push images
        run: |
          docker build -t gcr.io/$PROJECT_ID/nix-pm-frontend:$GITHUB_SHA ./nix-pm
          docker build -t gcr.io/$PROJECT_ID/nix-pm-backend:$GITHUB_SHA ./nix-pm-backend
          docker push gcr.io/$PROJECT_ID/nix-pm-frontend:$GITHUB_SHA
          docker push gcr.io/$PROJECT_ID/nix-pm-backend:$GITHUB_SHA

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/frontend frontend=gcr.io/$PROJECT_ID/nix-pm-frontend:$GITHUB_SHA -n nix-pm
          kubectl set image deployment/backend backend=gcr.io/$PROJECT_ID/nix-pm-backend:$GITHUB_SHA -n nix-pm
```

---

## Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod <pod-name> -n nix-pm
   kubectl logs <pod-name> -n nix-pm
   ```

2. **Database connection errors**
   - Check database service is running
   - Verify credentials in secrets
   - Check network policies

3. **Image pull errors**
   - Verify registry credentials
   - Check image names and tags
   - Ensure cluster has access to registry

4. **Health check failures**
   - Check application logs
   - Verify health endpoint is accessible
   - Adjust initialDelaySeconds if needed

### Useful Commands

```bash
# Get all resources
kubectl get all -n nix-pm

# Describe resource
kubectl describe <resource-type> <resource-name> -n nix-pm

# Shell into pod
kubectl exec -it <pod-name> -n nix-pm -- /bin/sh

# View events
kubectl get events -n nix-pm --sort-by='.lastTimestamp'

# Scale deployment
kubectl scale deployment/backend --replicas=3 -n nix-pm

# Restart deployment
kubectl rollout restart deployment/backend -n nix-pm
```

---

## Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/<service> -n nix-pm`
- Review README.md for application-specific documentation
- Contact support team

## License

MIT
