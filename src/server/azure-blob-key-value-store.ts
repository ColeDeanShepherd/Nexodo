import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { KeyValueStore } from './key-value-store';

/**
 * Azure Blob Storage implementation of KeyValueStore.
 * This implementation only supports the key "db" which maps to a "db.json" blob
 * in Azure Blob Storage.
 */
export class AzureBlobKeyValueStore implements KeyValueStore {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private readonly SUPPORTED_KEY = 'db';
  private readonly BLOB_NAME = 'db.json';

  constructor(accountName: string, accountKey: string, containerName: string = 'datastore') {
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );
    this.containerName = containerName;
  }

  private ensureKeyIsDb(key: string): void {
    if (key !== this.SUPPORTED_KEY) {
      throw new Error(`Only key "db" is supported. Received: "${key}"`);
    }
  }

  async get(key: string): Promise<string | null> {
    this.ensureKeyIsDb(key);

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(this.BLOB_NAME);

      // Check if blob exists
      const exists = await blobClient.exists();
      if (!exists) {
        return null;
      }

      // Download blob content
      const downloadResponse = await blobClient.download();
      const downloaded = await streamToString(downloadResponse.readableStreamBody!);
      
      return downloaded;
    } catch (error) {
      console.error('Error getting value from Azure Blob Storage:', error);
      throw error;
    }
  }

  async set(key: string, value: string): Promise<void> {
    this.ensureKeyIsDb(key);

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(this.BLOB_NAME);

      // Upload the value as blob content
      await blockBlobClient.upload(value, value.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json',
        },
      });
    } catch (error) {
      console.error('Error setting value in Azure Blob Storage:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    this.ensureKeyIsDb(key);

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(this.BLOB_NAME);

      const deleteResponse = await blobClient.deleteIfExists();
      return deleteResponse.succeeded;
    } catch (error) {
      console.error('Error deleting value from Azure Blob Storage:', error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    this.ensureKeyIsDb(key);

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(this.BLOB_NAME);

      return await blobClient.exists();
    } catch (error) {
      console.error('Error checking existence in Azure Blob Storage:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // BlobServiceClient doesn't require explicit cleanup
  }
}

/**
 * Helper function to convert a readable stream to a string
 */
async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    readableStream.on('error', reject);
  });
}
