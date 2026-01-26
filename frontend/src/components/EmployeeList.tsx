import { Employee, formatDepartment } from '../types/Employee';

interface EmployeeListProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: number) => void;
  loading: boolean;
}

function EmployeeList({ employees, onEdit, onDelete, loading }: EmployeeListProps) {
  if (loading) {
    return <div className="loading">Loading employees...</div>;
  }

  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <p>No employees found. Add your first employee!</p>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="table-container">
      <table className="employee-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Salary</th>
            <th>Hire Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.id}</td>
              <td>{employee.firstName} {employee.lastName}</td>
              <td>{employee.email}</td>
              <td>
                <span className={`badge badge-${employee.department.toLowerCase()}`}>
                  {formatDepartment(employee.department)}
                </span>
              </td>
              <td>{formatCurrency(employee.salary)}</td>
              <td>{formatDate(employee.hireDate)}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn btn-sm btn-edit"
                    onClick={() => onEdit(employee)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-delete"
                    onClick={() => employee.id && onDelete(employee.id)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeList;
