# Azure Container Apps Deployment Setup

This guide will help you set up automatic deployment to Azure Container Apps for the Nexodo application using Infrastructure as Code (Pulumi with TypeScript).

## Prerequisites

- Azure subscription
- GitHub repository with admin access
- **Azure CLI** - Only needed if:
  - Using Azure Blob Storage backend (Option B), OR
  - Deploying locally (optional)
- **Node.js 18+** - Only for local development (optional)

## Backend Options

Pulumi needs a backend to store infrastructure state. You have two options:

**Option A: Pulumi Cloud (Recommended - Easiest)**
- Free for individuals
- Managed state storage
- Built-in secrets encryption
- Web UI for viewing deployments

**Option B: Azure Blob Storage (No Pulumi account needed)**
- Use your existing Azure subscription
- No external dependencies
- Self-managed state storage

This guide covers both options below.

## What Gets Deployed

This setup uses **Pulumi with TypeScript** for Infrastructure as Code (IaC), which automatically provisions and manages:
- Resource Group
- Container Registry
- Container Apps Environment (with Log Analytics)
- Container App with auto-scaling and health checks

**Everything is automated via GitHub Actions** - no manual Azure CLI commands needed!

## Step 1: Choose Your Backend

### Option A: Pulumi Cloud (Recommended)

#### 1.1 Create a Pulumi account
1. Go to [app.pulumi.com](https://app.pulumi.com)
2. Sign up or log in (free for individuals)
3. Create a new access token: Settings → Access Tokens → Create token
4. Save the token - you'll add it to GitHub secrets as `PULUMI_ACCESS_TOKEN`

#### 1.2 GitHub Secrets for Pulumi Cloud
You'll need to add:
- `PULUMI_ACCESS_TOKEN` - Your Pulumi access token
- `PULUMI_CONFIG_PASSPHRASE` - Any secure string for encrypting secrets

### Option B: Azure Blob Storage Backend (No Pulumi Account)

**Important:** This option requires Azure CLI access. Follow "Step 2: Local Azure Setup" first if choosing this option.

#### 1.1 Create a storage account for Pulumi state

**Note:** Pulumi state must be in a separate resource group from the infrastructure it manages. This avoids circular dependencies.

```bash
# Create a separate resource group for Pulumi state
az group create \
  --name nexodo-pulumi-state \
  --location eastus

# Create storage account for Pulumi state
az storage account create \
  --name nexodopulumistate \
  --resource-group nexodo-pulumi-state \
  --location eastus \
  --sku Standard_LRS

# Create container
az storage container create \
  --name pulumi-state \
  --account-name nexodopulumistate
```

#### 1.2 Update GitHub workflow
Add to the workflow file before the Pulumi action:
```yaml
- name: Configure Pulumi backend
  run: pulumi login azblob://pulumi-state
  env:
    AZURE_STORAGE_ACCOUNT: nexodopulumistate
```

#### 1.3 GitHub Secrets for Azure Backend
You'll only need:
- `PULUMI_CONFIG_PASSPHRASE` - Any secure string for encrypting secrets
- Azure credentials (already configured in `AZURE_CREDENTIALS`)

**No `PULUMI_ACCESS_TOKEN` needed!**

## Step 2: Local Azure Setup (Optional - Only for Local Development)

**Skip this step if you're only deploying via GitHub Actions!**

The GitHub Actions workflow handles Azure authentication automatically using the service principal. You only need to do this if you want to deploy from your local machine.

### 2.1 Log in to Azure
```bash
az login
```

### 2.2 Set your subscription (if you have multiple)
```bash
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

## Step 3: Initialize Pulumi (Optional - Local Development Only)

If you want to deploy locally:

### For Pulumi Cloud:
```bash
cd infra
npm install
pulumi login
pulumi stack init prod
```

### For Azure Blob Storage:
```bash
cd infra
npm install
export AZURE_STORAGE_ACCOUNT=nexodopulumistate
pulumi login azblob://pulumi-state
pulumi stack init prod
```

## Step 4: Create Azure Service Principal

Create a service principal for GitHub Actions:

```bash
az ad sp create-for-rbac \
  --name "nexodo-github-actions" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID} \
  --sdk-auth
```

**Note:** We use subscription-level scope so the service principal can create the `nexodo-rg` resource group. If using Azure Blob Storage backend, ensure it also has access to the `nexodo-pulumi-state` resource group.

This will output JSON credentials. Save the entire JSON output for the next step.

## Step 5: Configure GitHub Secrets

Go to your GitHub repository settings and add the following secrets:
**Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets:

1. **AZURE_CREDENTIALS**
   - Value: The entire JSON output from the service principal creation

2. **AZURE_CONTAINER_REGISTRY**
   - Value: `nexodoacr.azurecr.io` (your registry login server - will be created by Pulumi)

3. **AZURE_CONTAINER_REGISTRY_NAME**
   - Value: `nexodoacr` (just the name, without .azurecr.io)

4. **REGISTRY_USERNAME**
   - Value: Will be `nexodoacr` after first deployment (or get from Azure Portal after deployment)

5. **REGISTRY_PASSWORD**
   - Value: Get from Azure Portal → Container Registry → Access keys after first deployment

6. **AZURE_RESOURCE_GROUP**
   - Value: `nexodo-rg`

7. **AZURE_CONTAINER_APP_NAME**
   - Value: `nexodo-app`

8. **AZURE_CONTAINER_APP_ENVIRONMENT**
   - Value: `nexodo-env`

### Backend-Specific Secrets:

**If using Pulumi Cloud (Option A):**

9. **PULUMI_ACCESS_TOKEN**
   - Value: Your Pulumi access token from app.pulumi.com

10. **PULUMI_CONFIG_PASSPHRASE**
   - Value: A secure passphrase for encrypting Pulumi secrets

**If using Azure Blob Storage (Option B):**

9. **PULUMI_CONFIG_PASSPHRASE**
   - Value: A secure passphrase for encrypting Pulumi secrets
   - Note: No PULUMI_ACCESS_TOKEN needed!

10. **AZURE_STORAGE_ACCOUNT** (if using Azure backend)
   - Value: `nexodopulumistate`

### Application Secrets (adjust based on your app):

11. **GOOGLE_CLIENT_ID** - Your Google OAuth client ID
12. **GOOGLE_CLIENT_SECRET** - Your Google OAuth client secret
13. **GOOGLE_REDIRECT_URI** - Your Azure Container App URL + callback path (e.g., `https://nexodo-app.azurecontainerapps.io/auth/callback`)
14. **JWT_SECRET** - A secure random string for JWT signing
15. **DATABASE_URL** - Your PostgreSQL database connection string

**Note:** After the first deployment, you can get the actual Container App URL from the workflow output or Azure Portal to update `GOOGLE_REDIRECT_URI`.

## Step 6: Deploy via GitHub Actions

1. Push a commit to the `main` branch
2. Go to the **Actions** tab in your GitHub repository
3. Watch the deployment workflow run:
   - **deploy-infrastructure** job: Creates/updates Azure resources using Pulumi
   - **build-and-deploy** job: Builds and deploys your Docker container
4. Once complete, the infrastructure and app will be live

## Step 7: Get Registry Credentials (First Deployment Only)

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

## Manual Pulumi Deployment (Optional)

Deploy infrastructure manually using Pulumi CLI:

```bash
cd infra
pulumi login
pulumi stack select prod

# Set configuration
pulumi config set nexodo-infra:resourceGroupName nexodo-rg
pulumi config set nexodo-infra:googleClientId "your-client-id"
pulumi config set --secret nexodo-infra:googleClientSecret "your-secret"
pulumi config set --secret nexodo-infra:jwtSecret "your-jwt-secret"
pulumi config set --secret nexodo-infra:databaseUrl "your-db-url"
pulumi config set nexodo-infra:googleRedirectUri "https://your-app-url/auth/callback"

# Preview changes
pulumi preview

# Deploy
pulumi up
```

## Step 6: Verify Deployment
## Step 6: Verify Deployment

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

## Step 7: Update Environment Variables (Optional)

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
