import {
  User,
  District,
  AssemblyConstituency,
  ComplaintCategory,
  Application,
  DashboardStats,
  BlockStat,
  CategoryStat,
  Appointment
} from '../types';

const API_BASE = '/api';

const browserFetch = globalThis.fetch.bind(globalThis);
let activeRequestCount = 0;
const requestActivityListeners = new Set<(active: boolean) => void>();

const notifyRequestActivity = () => {
  const active = activeRequestCount > 0;
  requestActivityListeners.forEach(listener => listener(active));
};

export const subscribeToApiActivity = (listener: (active: boolean) => void) => {
  requestActivityListeners.add(listener);
  listener(activeRequestCount > 0);
  return () => { requestActivityListeners.delete(listener); };
};

// All API calls in this module pass through this wrapper so the UI can show
// one consistent loader, including parallel requests.
async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  activeRequestCount += 1;
  notifyRequestActivity();
  try {
    const response = await browserFetch(input, init);
    if (response.status === 401 && localStorage.getItem('bacms_token')) {
      localStorage.removeItem('bacms_token');
      window.dispatchEvent(new CustomEvent('bacms-session-expired'));
    }
    return response;
  } finally {
    activeRequestCount = Math.max(0, activeRequestCount - 1);
    notifyRequestActivity();
  }
}

function getHeaders(isFormData = false): HeadersInit {
  const token = localStorage.getItem('bacms_token');
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // --- Auth ---
  async login(credentials: { email?: string; username?: string; password: string; captchaId?: string; captchaCode?: string } | string, pwd?: string): Promise<{ token: string; user: User }> {
    let payload: any;
    if (typeof credentials === 'string') {
      payload = { email: credentials, password: pwd };
    } else {
      payload = credentials;
    }

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('bacms_token', data.token);
    return data;
  },

  async getCaptcha(): Promise<{ captchaId: string; svgDataUrl: string; code?: string }> {
    const res = await fetch(`${API_BASE}/auth/captcha?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate CAPTCHA');
    return data;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to request password reset');
    return data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password reset failed');
    return data;
  },

  async validatePasswordResetToken(token: string): Promise<{ valid: boolean }> {
    const res = await fetch(`${API_BASE}/auth/reset-password/${encodeURIComponent(token)}/validate`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'This password reset link is invalid or has expired.');
    return data;
  },

  async demoSwitch(role: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/demo-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Demo switch failed');
    localStorage.setItem('bacms_token', data.token);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Session expired');
    return data;
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('bacms_token');
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        // Ignore network failure during logout
      }
    }
    localStorage.removeItem('bacms_token');
  },

  async getUsers(): Promise<{ users: User[] }> {
    const res = await fetch(`${API_BASE}/auth/users`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
    return data;
  },

  async updateAdminProfile(payload: { name: string; email: string; phone?: string }): Promise<{ success: boolean; message: string; user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update admin profile');
    if (data.token) localStorage.setItem('bacms_token', data.token);
    return data;
  },

  async changeAdminPassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    return data;
  },

  async createOperator(payload: {
    name: string;
    email: string;
    phone: string;
    blockName: string;
    blockLgdCode: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...payload,
        role: 'DATA_ENTRY',
        districtName: 'Munger',
        constituencyName: 'Tarapur'
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create operator');
    return data;
  },

  async deleteOperator(id: string, password: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete operator account');
    return data;
  },

  // --- Visitor Appointments ---
  async getAppointments(): Promise<{ appointments: Appointment[] }> {
    const res = await fetch(`${API_BASE}/appointments`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load appointments');
    return data;
  },

  subscribeToAppointmentEvents(onUpdate: (event: { action: string; operatorId: string; appointmentId?: string; visitorName?: string; appointmentDate?: string | null; appointmentTime?: string | null }) => void): () => void {
    let stopped = false;
    let activeController: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (stopped) return;
      activeController = new AbortController();
      try {
        const response = await browserFetch(`${API_BASE}/appointments/events`, {
          headers: getHeaders(),
          signal: activeController.signal
        });
        if (!response.ok || !response.body) throw new Error('Appointment event stream unavailable');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          events.forEach(eventBlock => {
            if (!eventBlock.includes('event: appointment-update')) return;
            const dataLine = eventBlock.split('\n').find(line => line.startsWith('data:'));
            if (!dataLine) return;
            try {
              onUpdate(JSON.parse(dataLine.slice(5).trim()));
            } catch {
              // Ignore malformed stream messages and keep the connection alive.
            }
          });
        }
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === 'AbortError')) return;
      }

      if (!stopped) reconnectTimer = setTimeout(() => void connect(), 2500);
    };

    void connect();
    return () => {
      stopped = true;
      activeController?.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  },

  async createAppointment(payload: { visitorName: string; phone: string; address: string; purpose: string }): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register visitor appointment');
    return data;
  },

  async decideAppointment(id: string, payload: { decision: 'APPROVE' | 'REJECT' | 'RESCHEDULE'; appointmentDate?: string; appointmentTime?: string }): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments/${id}/decision`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update appointment');
    return data;
  },

  // --- Master Data ---
  async getDistricts(): Promise<{ districts: District[] }> {
    const res = await fetch(`${API_BASE}/master/districts`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch districts');
    return data;
  },

  async getConstituencies(districtId?: number): Promise<{ constituencies: AssemblyConstituency[] }> {
    const url = districtId
      ? `${API_BASE}/master/constituencies?districtId=${districtId}`
      : `${API_BASE}/master/constituencies`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch constituencies');
    return data;
  },

  async getValidationReport(): Promise<any> {
    const res = await fetch(`${API_BASE}/master/validation-report`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch validation report');
    return data;
  },

  async previewImportConstituencies(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/master/import/preview-constituencies`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'CSV import validation failed');
    return data;
  },

  // --- Categories ---
  async getCategories(): Promise<{ categories: ComplaintCategory[] }> {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch categories');
    return data;
  },

  async createCategory(cat: { name: string; code: string; description?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cat)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create category');
    return data;
  },

  // --- Applications ---
  async createApplication(payload: any): Promise<{ success: boolean; applicationId: string; application: Application }> {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create application');
    return data;
  },

  async getApplications(params: Record<string, any> = {}): Promise<{
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    applications: Application[];
  }> {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        query.set(k, String(v));
      }
    }
    const res = await fetch(`${API_BASE}/applications?${query.toString()}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch applications');
    return data;
  },

  async getApplication(idOrCode: string | number): Promise<{ application: Application }> {
    const res = await fetch(`${API_BASE}/applications/${idOrCode}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch application');
    return data;
  },

  async updateApplication(id: string, payload: any): Promise<{ success: boolean; application: Application }> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update application');
    return data;
  },

  async deleteApplication(id: number | string, password: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete application');
    return data;
  },

  async bulkDeleteApplications(ids: (number | string)[], password: string): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch(`${API_BASE}/applications/bulk-delete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ids, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete applications');
    return data;
  },

  async clearAllApplications(password: string): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch(`${API_BASE}/applications/clear-all`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clear all applications');
    return data;
  },

  getExportCsvUrl(params: Record<string, any> = {}): string {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        query.set(k, String(v));
      }
    }
    const token = localStorage.getItem('bacms_token');
    if (token) {
      query.set('token', token);
    }
    return `${API_BASE}/applications/export/csv?${query.toString()}`;
  },

  // --- Reminders & Follow-Ups ---
  async getReminders(filterOverdue = false): Promise<{ reminders: Application[] }> {
    const res = await fetch(`${API_BASE}/reminders?filterOverdue=${filterOverdue}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch reminders');
    return data;
  },

  async addFollowUp(applicationId: string, payload: {
    actionTaken: string;
    reminderNotes: string;
    nextFollowUpDate?: string;
    reassignEmployee?: string;
    newStatus?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/reminders/${applicationId}/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add follow-up');
    return data;
  },

  async reopenApplication(applicationId: string, payload: {
    reopenReason: string;
    assignedEmployee?: string;
    nextFollowUpDate?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/reminders/${applicationId}/reopen`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reopen application');
    return data;
  },

  // --- Reports & Analytics ---
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/reports/dashboard-stats`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard stats');
    return data;
  },

  async getBlockReports(): Promise<{ blocks: BlockStat[] }> {
    const res = await fetch(`${API_BASE}/reports/block-wise`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch block reports');
    return data;
  },

  async getCategoryReports(): Promise<{ categories: CategoryStat[] }> {
    const res = await fetch(`${API_BASE}/reports/category-wise`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch category reports');
    return data;
  },

  async getAgeingReport(): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/ageing`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch ageing report');
    return data;
  },

  async getEmployeeWorkload(): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/employee-workload`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch employee workload');
    return data;
  },

  // --- Upload Files with Progress Tracking (up to 200MB) ---
  uploadFiles(files: FileList | File[], onProgress?: (percent: number) => void): Promise<{ files: any[] }> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload`);
      xhr.timeout = 10 * 60 * 1000; // 10 minute timeout for large 200MB transfers

      const token = localStorage.getItem('bacms_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || `Upload failed with HTTP status ${xhr.status}`));
          }
        } catch (e) {
          reject(new Error('Invalid server response during upload'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network connection error during file upload. Please check connectivity.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('File upload timed out. Large files up to 200MB require sufficient network bandwidth.'));
      };

      xhr.onabort = () => {
        reject(new Error('File upload was cancelled.'));
      };

      xhr.send(formData);
    });
  },

  // --- Settings ---
  async getSettings(): Promise<{ settings: any }> {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch settings');
    return data;
  },

  async updateSettings(payload: any): Promise<{ success: boolean; settings: any }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data;
  },

};
