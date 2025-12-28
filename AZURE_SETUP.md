# Azure Container Apps Deployment Setup

This guide will help you set up automatic deployment to Azure Container Apps for the Nexodo application using Infrastructure as Code (Bicep).

## Prerequisites

- Azure subscription
- Azure CLI installed (`az` command)
- GitHub repository with admin access

## Deployment Options

This setup uses **Azure Bicep** for Infrastructure as Code (IaC), which automatically provisions and manages:
- Container Registry
- Container Apps Environment (with Log Analytics)
- Container App with auto-scaling and health checks

## Step 1: Create Resource Group

### 1.1 Log in to Azure
```bash
az login
```

### 1.2 Set your subscription (if you have multiple)
```bash
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### 1.3 Create a Resource Group
```bash
az group create \
  --name nexodo-rg \
  --location eastus
```

**Note:** All other resources will be created automatically via Bicep during deployment.

## Step 2: Create Azure Service Principal

Create a service principal for GitHub Actions:

```bash
az ad sp create-for-rbac \
  --name "nexodo-github-actions" \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/nexodo-rg \
  --sdk-auth
```

This will output JSON credentials. Save the entire JSON output for the next step.

## Step 3: Configure GitHub Secrets

Go to your GitHub repository settings and add the following secrets:
**Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets:

1. **AZURE_CREDENTIALS**
   - Value: The entire JSON output from the service principal creation

2. **AZURE_CONTAINER_REGISTRY**
   - Value: `nexodoacr.azurecr.io` (your registry login server - will be created by Bicep)

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

### Application Secrets (adjust based on your app):

8. **GOOGLE_CLIENT_ID** - Your Google OAuth client ID
9. **GOOGLE_CLIENT_SECRET** - Your Google OAuth client secret
10. **GOOGLE_REDIRECT_URI** - Your Azure Container App URL + callback path (e.g., `https://nexodo-app.azurecontainerapps.io/auth/callback`)
11. **JWT_SECRET** - A secure random string for JWT signing
12. **DATABASE_URL** - Your PostgreSQL database connection string

**Note:** After the first deployment, you can get the actual Container App URL from the workflow output or Azure Portal to update `GOOGLE_REDIRECT_URI`.

## Step 4: Deploy via GitHub Actions

1. Push a commit to the `main` branch
2. Go to the **Actions** tab in your GitHub repository
3. Watch the deployment workflow run:
   - **deploy-infrastructure** job: Creates/updates Azure resources using Bicep
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

The Bicep template ([infra/main.bicep](infra/main.bicep)) provides:

- **Version Control**: Infrastructure changes are tracked in Git
- **Consistency**: Same infrastructure deployed every time
- **Easy Updates**: Modify parameters in the Bicep file to change resources
- **Automated**: No manual Azure Portal clicks required
- **Rollback**: Git history allows reverting infrastructure changes

### Customizing Infrastructure

Edit [infra/main.bicep](infra/main.bicep) to modify:
- CPU/Memory allocation
- Min/max replicas for scaling
- Health check configurations
- Environment variables

Or update [infra/main.parameters.json](infra/main.parameters.json) for local deployments.

## Manual Bicep Deployment (Optional)

Deploy infrastructure manually using Azure CLI:

```bash
az deployment group create \
  --resource-group nexodo-rg \
  --template-file infra/main.bicep \
  --parameters \
    containerRegistryName=nexodoacr \
    environmentName=nexodo-env \
    containerAppName=nexodo-app \
    googleClientId="your-client-id" \
    googleClientSecret="your-client-secret" \
    googleRedirectUri="https://your-app-url/auth/callback" \
    jwtSecret="your-jwt-secret" \
    databaseUrl="your-database-url"
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

**Option 3: Update Bicep template**
- Modify environment variables in [infra/main.bicep](infra/main.bicep)
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

Auto-scaling is configured in the Bicep template. To modify:

1. Edit [infra/main.bicep](infra/main.bicep):
   ```bicep
   param minReplicas int = 1
   param maxReplicas int = 5
   ```

2. Push to main branch to apply changes

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

- [Azure Bicep Documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/)

## Terraform Alternative (Optional)

If you prefer Terraform over Bicep, you can convert the Bicep template or create equivalent Terraform configuration. Terraform offers:
- Multi-cloud support
- Larger ecosystem of providers
- State management features

For a Terraform setup, create `.tf` files in an `infra/terraform/` directory and update the GitHub Actions workflow to use Terraform actions instead of `azure/arm-deploy`.
