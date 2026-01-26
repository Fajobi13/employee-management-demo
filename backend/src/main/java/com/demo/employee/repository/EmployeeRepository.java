package com.demo.employee.repository;

import com.demo.employee.model.Department;
import com.demo.employee.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    List<Employee> findByDepartment(Department department);

    Optional<Employee> findByEmail(String email);

    boolean existsByEmail(String email);
}
