// Environment API service - handles loading/saving environment to server
export class EnvironmentService {
  constructor(private getToken: () => string | null) {}

  async saveEnvironment(serializedEnv: Record<string, any>): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/db/value', {
        method: 'POST',
        headers,
        body: JSON.stringify({ value: JSON.stringify(serializedEnv) }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save environment: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save environment to server:', error);
      throw error;
    }
  }

  async loadEnvironment(): Promise<Record<string, any> | null> {
    try {
      const headers: Record<string, string> = {};
      
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/db/value', { headers });
      
      if (response.status === 404) {
        // No saved environment exists yet
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load environment: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return JSON.parse(data.value);
    } catch (error) {
      console.warn('Failed to load environment from server:', error);
      throw error;
    }
  }
}