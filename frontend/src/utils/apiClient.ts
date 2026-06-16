import axios from 'axios';
import syncQueue from './syncQueue';

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Login
   */
  async login(email: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE}/api/v1/auth/login`, {
        email,
        password
      });
      this.setToken(response.data.token);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get vessels
   */
  async getVessels() {
    try {
      const response = await axios.get(`${API_BASE}/api/v1/vessels`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching vessels:', error);
      throw error;
    }
  }

  /**
   * Get vessel detail
   */
  async getVessel(vesselId: string) {
    try {
      const response = await axios.get(`${API_BASE}/api/v1/vessels/${vesselId}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching vessel:', error);
      throw error;
    }
  }

  /**
   * Get readiness
   */
  async getReadiness(vesselId: string, missionProfile: string = 'patrol') {
    try {
      const response = await axios.get(
        `${API_BASE}/api/v1/vessels/${vesselId}/readiness?missionProfile=${missionProfile}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching readiness:', error);
      throw error;
    }
  }

  /**
   * Get costs
   */
  async getCosts(vesselId: string, period: string) {
    try {
      const response = await axios.get(
        `${API_BASE}/api/v1/vessels/${vesselId}/costs?period=${period}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching costs:', error);
      throw error;
    }
  }

  /**
   * Get cost drivers
   */
  async getCostDrivers(vesselId: string, period: string) {
    try {
      const response = await axios.get(
        `${API_BASE}/api/v1/vessels/${vesselId}/costs/drivers?period=${period}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching cost drivers:', error);
      throw error;
    }
  }

  /**
   * Get tasks
   */
  async getTasks(vesselId?: string, status?: string) {
    try {
      let url = `${API_BASE}/api/v1/tasks`;
      const params = new URLSearchParams();
      if (vesselId) params.append('vesselId', vesselId);
      if (status) params.append('status', status);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  /**
   * Complete task (with offline support)
   */
  async completeTask(taskId: string, data: any) {
    const payload = {
      type: 'logEntry' as const,
      taskId,
      ...data
    };

    if (!syncQueue.getOnlineStatus()) {
      // Queue for later sync
      const eventId = syncQueue.enqueue('logEntry', payload, 'high');
      console.log('Queued task completion:', eventId);
      return { queued: true, eventId };
    }

    try {
      const response = await axios.post(
        `${API_BASE}/api/v1/tasks/${taskId}/complete`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      // Fallback to queue if online request fails
      const eventId = syncQueue.enqueue('logEntry', payload, 'high');
      console.error('Error completing task, queued:', eventId);
      throw error;
    }
  }

  /**
   * Get mission profiles
   */
  async getMissionProfiles() {
    try {
      const response = await axios.get(`${API_BASE}/api/v1/mission-profiles`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching mission profiles:', error);
      throw error;
    }
  }

  /**
   * Sync offline changes
   */
  async syncOfflineChanges() {
    return syncQueue.syncPending(API_BASE, this.token || '');
  }
}

export default new ApiClient();
