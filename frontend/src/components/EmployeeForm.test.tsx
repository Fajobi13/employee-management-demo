import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmployeeForm from './EmployeeForm';
import { Employee } from '../types/Employee';

describe('EmployeeForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    employee: null,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form for new employee', () => {
    render(<EmployeeForm {...defaultProps} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('');
    expect(screen.getByLabelText(/email/i)).toHaveValue('');
  });

  it('renders form with employee data when editing', () => {
    const employee: Employee = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      department: 'ENGINEERING',
      salary: 75000,
      hireDate: '2023-01-15',
    };

    render(<EmployeeForm {...defaultProps} employee={employee} />);

    expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
    expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com');
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<EmployeeForm {...defaultProps} />);

    fireEvent.click(screen.getByText(/cancel/i));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('renders department select', () => {
    render(<EmployeeForm {...defaultProps} />);

    const departmentSelect = screen.getByLabelText(/department/i);
    expect(departmentSelect).toBeInTheDocument();
    expect(departmentSelect.tagName).toBe('SELECT');
  });

  it('shows Add Employee title for new employee', () => {
    render(<EmployeeForm {...defaultProps} />);
    expect(screen.getByText('Add Employee')).toBeInTheDocument();
  });

  it('shows Edit Employee title when editing', () => {
    const employee: Employee = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      department: 'ENGINEERING',
      salary: 75000,
      hireDate: '2023-01-15',
    };

    render(<EmployeeForm {...defaultProps} employee={employee} />);
    expect(screen.getByText('Edit Employee')).toBeInTheDocument();
  });

  it('shows Create button for new employee', () => {
    render(<EmployeeForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('shows Update button when editing', () => {
    const employee: Employee = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      department: 'ENGINEERING',
      salary: 75000,
      hireDate: '2023-01-15',
    };

    render(<EmployeeForm {...defaultProps} employee={employee} />);
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });
});
