interface NavbarProps {
  onAddClick: () => void;
}

function Navbar({ onAddClick }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>Employee Management</h1>
      </div>
      <div className="navbar-actions">
        <button className="btn btn-primary" onClick={onAddClick}>
          + Add Employee
        </button>
        <a
          href="/swagger-ui.html"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          API Docs
        </a>
      </div>
    </nav>
  );
}

export default Navbar;
