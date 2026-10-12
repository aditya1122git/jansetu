import {
  User,
  District,
  AssemblyConstituency,
  ComplaintCategory,
  Application,
  DashboardStats,
  DistrictStat,
  CategoryStat,
  AuditLogRecord
} from '../types';

const API_BASE = '/api';

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

  async forgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
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

  async getAuditLogs(): Promise<{ logs: AuditLogRecord[] }> {
    const res = await fetch(`${API_BASE}/auth/audit-logs`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch audit logs');
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

  async deleteApplication(id: number | string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete application');
    return data;
  },

  async bulkDeleteApplications(ids: (number | string)[]): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch(`${API_BASE}/applications/bulk-delete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ids })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete applications');
    return data;
  },

  async clearAllApplications(): Promise<{ success: boolean; count: number; message: string }> {
    const res = await fetch(`${API_BASE}/applications/clear-all`, {
      method: 'POST',
      headers: getHeaders()
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

  async getDistrictReports(): Promise<{ districts: DistrictStat[] }> {
    const res = await fetch(`${API_BASE}/reports/district-wise`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch district reports');
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
