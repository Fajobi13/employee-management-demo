import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';

describe('Navbar', () => {
  const mockOnAddClick = vi.fn();

  it('renders the application title', () => {
    render(<Navbar onAddClick={mockOnAddClick} />);
    expect(screen.getByText('Employee Management')).toBeInTheDocument();
  });

  it('renders add employee button', () => {
    render(<Navbar onAddClick={mockOnAddClick} />);
    expect(screen.getByText('+ Add Employee')).toBeInTheDocument();
  });

  it('renders API docs link', () => {
    render(<Navbar onAddClick={mockOnAddClick} />);
    expect(screen.getByText('API Docs')).toBeInTheDocument();
  });
});
