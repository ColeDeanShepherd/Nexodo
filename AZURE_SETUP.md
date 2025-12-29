# Azure Container Apps Deployment Setup

This guide will help you set up automatic deployment to Azure Container Apps for the Nexodo application using Infrastructure as Code (Pulumi with TypeScript).

## Prerequisites

- Azure subscription
- GitHub repository with admin access
- **Azure CLI** - Only needed for initial setup of Pulumi state storage (one-time)

## What Gets Deployed

This setup uses **Pulumi with TypeScript** for Infrastructure as Code (IaC), which automatically provisions and manages:
- Resource Group
- Container Registry
- Container Apps Environment (with Log Analytics)
- Container App with auto-scaling and health checks

**Everything is automated via GitHub Actions** - no manual Azure CLI commands needed!

## Step 1: Set Up Pulumi State Storage

Pulumi uses Azure Blob Storage to store infrastructure state. This must be in a separate resource group from the infrastructure it manages to avoid circular dependencies.

```bash
# Log in to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Create a separate resource group for Pulumi state
az group create \
  --name nexodo-pulumi-state \
  --location westus

# Create storage account for Pulumi state
az storage account create \
  --name nexodopulumistate \
  --resource-group nexodo-pulumi-state \
  --location westus \
  --sku Standard_LRS

# Create container
az storage container create \
  --name pulumi-state \
  --account-name nexodopulumistate
```

## Step 2: Create Azure Service Principal

Create a service principal for GitHub Actions:

```bash
az ad sp create-for-rbac \
  --name "nexodo-github-actions" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID} \
  --sdk-auth
```

**Note:** We use subscription-level scope so the service principal can create the `nexodo-rg` resource group and access the `nexodo-pulumi-state` resource group.

This will output JSON credentials. Save the entire JSON output for the next step.

## Step 3: Configure GitHub Secrets

Go to your GitHub repository settings and add the following secrets:
**Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets:

1. **AZURE_CREDENTIALS**
   - Value: The entire JSON output from the service principal creation

2. **AZURE_CONTAINER_REGISTRY_NAME**
   - Value: `nexodoacr` (just the name, without .azurecr.io)

3. **AZURE_RESOURCE_GROUP**
   - Value: `nexodo-rg`

4. **AZURE_CONTAINER_APP_NAME**
   - Value: `nexodo-app`

5. **AZURE_CONTAINER_APP_ENVIRONMENT**
   - Value: `nexodo-env`

### Pulumi Secrets:

6. **PULUMI_CONFIG_PASSPHRASE**
   - Value: A secure passphrase for encrypting Pulumi secrets (any string you choose)

7. **AZURE_STORAGE_ACCOUNT**
   - Value: `nexodopulumistate`

### Application Secrets (adjust based on your app):

8. **JWT_SECRET** - A secure random string for JWT signing
9. **DATABASE_URL** - Your PostgreSQL database connection string
10. **APP_PASSWORD** - The password protecting the app's data.

## Step 4: Deploy via GitHub Actions

1. Push a commit to the `main` branch
2. Go to the **Actions** tab in your GitHub repository
3. Watch the deployment workflow run:
   - **deploy-infrastructure** job: Creates/updates Azure resources using Pulumi
   - **build-and-deploy** job: Builds and deploys your Docker container
4. Once complete, the infrastructure and app will be live

## Step 5: Get Registry Credentials (First Deployment Only)

After the first successful deployment, get the ACR credentials to update GitHub secrets:

```bash
az acr credential show --name nexodoacr --resource-group nexodo-rg
```

Update these GitHub secrets with the values:
- **REGISTRY_USERNAME**: The username from the output
- **REGISTRY_PASSWORD**: One of the passwords from the output

## Infrastructure as Code Benefits

The Pulumi TypeScript program ([infra/index.ts](infra/index.ts)) provides:

- **Version Control**: Infrastructure changes are tracked in Git
- **Consistency**: Same infrastructure deployed every time
- **Type Safety**: TypeScript provides compile-time checking and IntelliSense
- **Testable**: Write unit tests for your infrastructure code
- **Automated**: No manual Azure Portal clicks required
- **Rollback**: Git history allows reverting infrastructure changes
- **Real Programming Language**: Full power of TypeScript - loops, functions, packages

### Customizing Infrastructure

Edit [infra/index.ts](infra/index.ts) to modify:
- CPU/Memory allocation
- Min/max replicas for scaling
- Health check configurations
- Environment variables
- Add new Azure resources

Or update [infra/Pulumi.prod.yaml](infra/Pulumi.prod.yaml) for configuration values.

## Step 5: Verify Deployment

Get your app URL:
```bash
az containerapp show \
  --name nexodo-app \
  --resource-group nexodo-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

Test the health endpoint:
```bash
curl https://YOUR_APP_URL/api/health
```

## Updating Environment Variables

To update environment variables after deployment without redeploying infrastructure:

**Option 1: Update via GitHub Secrets**
- Update the secret in GitHub
- Push a new commit to trigger redeployment

**Option 2: Update via Azure CLI**
```bash
az containerapp update \
  --name nexodo-app \
  --resource-group nexodo-rg \
  --set-env-vars \
    NODE_ENV=production \
    CUSTOM_VAR=value
```

**Option 3: Update Pulumi program**
- Modify environment variables in [infra/index.ts](infra/index.ts)
- Push to main branch to redeploy

## Monitoring and Logs

View logs:
```bash
az containerapp logs show \
  --name nexodo-app \
  --resource-group nexodo-rg \
  --follow
```

View metrics in Azure Portal:
- Navigate to your Container App in the Azure Portal
- Go to **Monitoring → Metrics** or **Monitoring → Logs**

## Scaling Configuration

Auto-scaling is configured in the Pulumi program. To modify:

1. Edit [infra/Pulumi.prod.yaml](infra/Pulumi.prod.yaml):
   ```yaml
   config:
     nexodo-infra:minReplicas: "1"
     nexodo-infra:maxReplicas: "5"
   ```

2. Push to main branch to apply changes

Or modify the defaults in [infra/index.ts](infra/index.ts):
```typescript
const minReplicas = config.getNumber("minReplicas") || 1;
const maxReplicas = config.getNumber("maxReplicas") || 5;
```

Or update manually:
```bash
az containerapp update \
  --name nexodo-app \
  --resource-group nexodo-rg \
  --min-replicas 0 \
  --max-replicas 5
```

## Cleaning Up Resources

To delete all Azure resources:

```bash
az group delete --name nexodo-rg --yes --no-wait
```

This removes the entire resource group and all contained resources (Container Registry, Container App, Environment, Log Analytics).

## Cost Optimization

- Container Apps are billed based on vCPU and memory usage
- Use `--min-replicas 0` for development to scale to zero when not in use
- Monitor costs in the Azure Portal under Cost Management

## Troubleshooting

### Deployment fails:
- Check GitHub Actions logs for detailed error messages
- Verify all secrets are correctly set in GitHub
- Ensure Azure resources are in the same region

### App not responding:
- Check container logs: `az containerapp logs show`
- Verify health check endpoint `/api/health` is accessible
- Check environment variables are properly set

### Registry authentication issues:
- Regenerate ACR credentials: `az acr credential renew`
- Update GitHub secrets with new credentials

## Additional Resources

- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [Pulumi Azure Native Provider](https://www.pulumi.com/registry/packages/azure-native/)
- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [Pulumi GitHub Actions](https://www.pulumi.com/docs/using-pulumi/continuous-delivery/github-actions/)

## Why Pulumi + TypeScript?

**Type Safety**: Get IntelliSense, compile-time errors, and refactoring support

**Real Code**: Use loops, conditionals, functions, and npm packages - it's just TypeScript

**Testing**: Write unit tests for your infrastructure using standard testing frameworks

**Multi-Cloud**: Same tool works for AWS, GCP, Kubernetes, and 100+ providers

**State Management**: Pulumi handles state automatically in the cloud (or self-hosted)

**Preview Changes**: See exactly what will change before applying

**Rich Ecosystem**: Leverage the entire TypeScript/Node.js ecosystem

### Example: Conditional Resources
```typescript
if (config.getBoolean("enableCdn")) {
  const cdn = new azure.cdn.Profile("cdn", { ... });
}
```

### Example: Loops
```typescript
const replicas = [1, 2, 3];
replicas.forEach(i => {
  new azure.app.ContainerApp(`app-${i}`, { ... });
});
```
