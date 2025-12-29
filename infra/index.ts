import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

// Get configuration
const config = new pulumi.Config();
const location = config.get("location") || "eastus";
const minReplicas = config.getNumber("minReplicas") || 1;
const maxReplicas = config.getNumber("maxReplicas") || 3;
const cpuCores = config.getNumber("cpuCores") || 0.5;
const memorySize = config.get("memorySize") || "1.0Gi";

// Get secrets from environment variables (passed from GitHub Actions)
const jwtSecret = pulumi.secret(process.env.JWT_SECRET || "");
const databaseUrl = pulumi.secret(process.env.DATABASE_URL || "");
const appPassword = pulumi.secret(process.env.APP_PASSWORD || "");

// Get resource names
const resourceGroupName = config.get("resourceGroupName") || "nexodo-rg";
const containerRegistryName = config.require("containerRegistryName");
const environmentName = config.require("environmentName");
const containerAppName = config.require("containerAppName");

// Create Resource Group
const resourceGroup = new azure.resources.ResourceGroup("resourceGroup", {
    resourceGroupName: resourceGroupName,
    location: location,
});

// Create Container Registry
const registry = new azure.containerregistry.Registry("registry", {
    resourceGroupName: resourceGroup.name,
    registryName: containerRegistryName,
    location: location,
    sku: {
        name: "Basic",
    },
    adminUserEnabled: true,
});

// Get registry credentials
const credentials = pulumi.all([resourceGroup.name, registry.name]).apply(([rgName, regName]) =>
    azure.containerregistry.listRegistryCredentials({
        resourceGroupName: rgName,
        registryName: regName,
    })
);

const registryUsername = credentials.apply(c => c.username!);
const registryPassword = credentials.apply(c => c.passwords![0].value!);

// Create Log Analytics Workspace
const workspace = new azure.operationalinsights.Workspace("workspace", {
    resourceGroupName: resourceGroup.name,
    workspaceName: `${environmentName}-logs`,
    location: location,
    sku: {
        name: "PerGB2018",
    },
    retentionInDays: 30,
});

// Get workspace keys
const workspaceSharedKeys = pulumi.all([resourceGroup.name, workspace.name]).apply(([rgName, wsName]) =>
    azure.operationalinsights.getSharedKeys({
        resourceGroupName: rgName,
        workspaceName: wsName,
    })
);

// Create Container Apps Environment
const environment = new azure.app.ManagedEnvironment("environment", {
    resourceGroupName: resourceGroup.name,
    environmentName: environmentName,
    location: location,
    appLogsConfiguration: {
        destination: "log-analytics",
        logAnalyticsConfiguration: {
            customerId: workspace.customerId,
            sharedKey: workspaceSharedKeys.apply(k => k.primarySharedKey!),
        },
    },
});

// Create Container App
const containerApp = new azure.app.ContainerApp("containerApp", {
    resourceGroupName: resourceGroup.name,
    containerAppName: containerAppName,
    location: location,
    managedEnvironmentId: environment.id,
    configuration: {
        ingress: {
            external: true,
            targetPort: 3000,
            transport: "auto",
            allowInsecure: false,
        },
        registries: [{
            server: registry.loginServer,
            username: registryUsername,
            passwordSecretRef: "registry-password",
        }],
        secrets: [
            {
                name: "registry-password",
                value: registryPassword,
            },
            {
                name: "jwt-secret",
                value: jwtSecret,
            },
            {
                name: "database-url",
                value: databaseUrl,
            },
            {
                name: "app-password",
                value: appPassword,
            },
        ],
    },
    template: {
        containers: [{
            name: "nexodo",
            image: pulumi.interpolate`${registry.loginServer}/nexodo:latest`,
            resources: {
                cpu: cpuCores,
                memory: memorySize,
            },
            env: [
                {
                    name: "NODE_ENV",
                    value: "production",
                },
                {
                    name: "PORT",
                    value: "3000",
                },
                {
                    name: "JWT_SECRET",
                    secretRef: "jwt-secret",
                },
                {
                    name: "DATABASE_URL",
                    secretRef: "database-url",
                },
                {
                    name: "APP_PASSWORD",
                    secretRef: "app-password",
                },
            ],
            probes: [
                {
                    type: "Liveness",
                    httpGet: {
                        path: "/api/health",
                        port: 3000,
                    },
                    initialDelaySeconds: 30,
                    periodSeconds: 30,
                    timeoutSeconds: 10,
                    failureThreshold: 3,
                },
                {
                    type: "Readiness",
                    httpGet: {
                        path: "/api/health",
                        port: 3000,
                    },
                    initialDelaySeconds: 10,
                    periodSeconds: 10,
                    timeoutSeconds: 5,
                    failureThreshold: 3,
                },
            ],
        }],
        scale: {
            minReplicas: minReplicas,
            maxReplicas: maxReplicas,
            rules: [{
                name: "http-scaling",
                http: {
                    metadata: {
                        concurrentRequests: "100",
                    },
                },
            }],
        },
    },
});

// Create Storage Account for Nexodo data (West US)
const dataStorageAccount = new azure.storage.StorageAccount("dataStorageAccount", {
    resourceGroupName: resourceGroup.name,
    accountName: config.require("dataStorageAccountName"),
    location: "westus",
    sku: {
        name: "Standard_LRS",
    },
    kind: "StorageV2",
    allowBlobPublicAccess: false,
});

// Create "db" container
const dbContainer = new azure.storage.BlobContainer("dbContainer", {
    resourceGroupName: resourceGroup.name,
    accountName: dataStorageAccount.name,
    containerName: "db",
    publicAccess: "None",
});

// Create "db" blob
const dbBlob = new azure.storage.Blob("dbBlob", {
    resourceGroupName: resourceGroup.name,
    accountName: dataStorageAccount.name,
    containerName: dbContainer.name,
    blobName: "db",
    type: "Block",
    source: new pulumi.asset.StringAsset(""), // Empty blob initially
});

// Export outputs
export const containerRegistryLoginServer = registry.loginServer;
export const containerRegistryNameOutput = registry.name;
export const containerAppFqdn = containerApp.configuration.apply(c => c?.ingress?.fqdn || "");
export const containerAppUrl = containerApp.configuration.apply(c => 
    c?.ingress?.fqdn ? `https://${c.ingress.fqdn}` : ""
);
export const environmentId = environment.id;
export const registryUsernamOutput = registryUsername;
export const dataStorageAccountName = dataStorageAccount.name;
export const dataStorageAccountPrimaryKey = pulumi.all([resourceGroup.name, dataStorageAccount.name]).apply(
    ([rgName, saName]) => 
        azure.storage.listStorageAccountKeys({
            resourceGroupName: rgName,
            accountName: saName,
        }).then(keys => keys.keys[0].value)
);
export const dbContainerName = dbContainer.name;
export const dbBlobName = dbBlob.name;
