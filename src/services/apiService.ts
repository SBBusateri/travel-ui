const API_BASE_URL = '/api';

class ApiService {
  async getYears(type = 'cars') {
    const response = await fetch(`${API_BASE_URL}/years?type=${type}`);
    if (!response.ok) throw new Error('Failed to fetch years');
    return response.json();
  }

  async getMakes(year: string, type = 'cars') {
    const response = await fetch(`${API_BASE_URL}/makes?year=${year}&type=${type}`);
    if (!response.ok) throw new Error('Failed to fetch makes');
    return response.json();
  }

  async getModels(year: string, make: string, type = 'cars') {
    const response = await fetch(`${API_BASE_URL}/models?year=${year}&make=${make}&type=${type}`);
    if (!response.ok) throw new Error('Failed to fetch models');
    return response.json();
  }

  async getEngines(year: string, make: string, model: string, type = 'cars') {
    const response = await fetch(`${API_BASE_URL}/engines?year=${year}&make=${make}&model=${model}&type=${type}`);
    if (!response.ok) throw new Error('Failed to fetch engines');
    return response.json();
  }

  async getVehicleInfo(data: {
    year: string;
    make: string;
    model: string;
    engine?: string;
    passengerWeight?: number;
    type?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/carInfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year: data.year,
        make: data.make,
        model: data.model,
        engine: data.engine || '',
        passengerWeight: data.passengerWeight || 0,
        type: data.type || 'cars'
      }),
    });
    
    if (!response.ok) throw new Error('Failed to fetch vehicle info');
    return response.json();
  }

  async calculateRoute(data: {
    startLocation: string;
    endLocation: string;
    adjustedRange: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/calculate-route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to calculate route');
    return response.json();
  }

  async checkHealth() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  }
}

export const apiService = new ApiService();
