import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import EmployeeList from './components/EmployeeList';
import EmployeeForm from './components/EmployeeForm';
import { Employee } from './types/Employee';
import { employeeApi } from './services/api';

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeApi.getAll();
      setEmployees(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch employees. Please try again.');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddClick = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeApi.delete(id);
        await fetchEmployees();
      } catch (err) {
        setError('Failed to delete employee. Please try again.');
        console.error('Error deleting employee:', err);
      }
    }
  };

  const handleFormSubmit = async (employeeData: Omit<Employee, 'id'>) => {
    try {
      if (editingEmployee?.id) {
        await employeeApi.update(editingEmployee.id, employeeData);
      } else {
        await employeeApi.create(employeeData);
      }
      setShowForm(false);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err) {
      setError('Failed to save employee. Please try again.');
      console.error('Error saving employee:', err);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  return (
    <div className="app">
      <Navbar onAddClick={handleAddClick} />

      <main className="main-content">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        <EmployeeList
          employees={employees}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      </main>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}

export default App;
