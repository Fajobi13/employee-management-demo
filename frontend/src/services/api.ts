import axios from 'axios';
import { Employee, Department } from '../types/Employee';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const employeeApi = {
  getAll: async (): Promise<Employee[]> => {
    const response = await api.get<Employee[]>('/employees');
    return response.data;
  },

  getById: async (id: number): Promise<Employee> => {
    const response = await api.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  getByDepartment: async (department: Department): Promise<Employee[]> => {
    const response = await api.get<Employee[]>(`/employees/department/${department}`);
    return response.data;
  },

  create: async (employee: Omit<Employee, 'id'>): Promise<Employee> => {
    const response = await api.post<Employee>('/employees', employee);
    return response.data;
  },

  update: async (id: number, employee: Omit<Employee, 'id'>): Promise<Employee> => {
    const response = await api.put<Employee>(`/employees/${id}`, employee);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },
};

export default api;
