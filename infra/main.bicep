@description('The location for all resources')
param location string = resourceGroup().location

@description('The name of the Container Registry')
param containerRegistryName string

@description('The name of the Container Apps Environment')
param environmentName string

@description('The name of the Container App')
param containerAppName string

@description('The minimum number of replicas')
@minValue(0)
@maxValue(30)
param minReplicas int = 1

@description('The maximum number of replicas')
@minValue(1)
@maxValue(30)
param maxReplicas int = 3

@description('CPU cores allocated to the container')
param cpuCores string = '0.5'

@description('Memory allocated to the container')
param memorySize string = '1.0Gi'

@description('Google OAuth Client ID')
@secure()
param googleClientId string

@description('Google OAuth Client Secret')
@secure()
param googleClientSecret string

@description('Google OAuth Redirect URI')
param googleRedirectUri string

@description('JWT Secret for token signing')
@secure()
param jwtSecret string

@description('Database connection string')
@secure()
param databaseUrl string

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
  }
}

// Log Analytics Workspace for Container Apps
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${environmentName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment
resource environment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'google-client-secret'
          value: googleClientSecret
        }
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'nexodo'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          resources: {
            cpu: json(cpuCores)
            memory: memorySize
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'GOOGLE_CLIENT_ID'
              value: googleClientId
            }
            {
              name: 'GOOGLE_CLIENT_SECRET'
              secretRef: 'google-client-secret'
            }
            {
              name: 'GOOGLE_REDIRECT_URI'
              value: googleRedirectUri
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output containerRegistryName string = containerRegistry.name
output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output environmentId string = environment.id
