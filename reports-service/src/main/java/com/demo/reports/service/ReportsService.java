package com.demo.reports.service;

import com.demo.reports.dto.*;
import com.demo.reports.model.Department;
import com.demo.reports.model.Employee;
import com.demo.reports.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportsService {

    private final EmployeeRepository employeeRepository;

    public HeadcountReportDTO getHeadcountReport() {
        List<Employee> allEmployees = employeeRepository.findAll();

        Map<String, Long> byDepartment = Arrays.stream(Department.values())
                .collect(Collectors.toMap(
                        Enum::name,
                        dept -> employeeRepository.countByDepartment(dept)
                ));

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate startOfYear = LocalDate.now().withDayOfYear(1);

        long newHiresThisMonth = allEmployees.stream()
                .filter(e -> !e.getHireDate().isBefore(startOfMonth))
                .count();

        long newHiresThisYear = allEmployees.stream()
                .filter(e -> !e.getHireDate().isBefore(startOfYear))
                .count();

        return new HeadcountReportDTO(
                (long) allEmployees.size(),
                byDepartment,
                newHiresThisMonth,
                newHiresThisYear
        );
    }

    public SalarySummaryDTO getSalarySummary() {
        List<Employee> employees = employeeRepository.findAll();

        if (employees.isEmpty()) {
            return new SalarySummaryDTO(0L, BigDecimal.ZERO, BigDecimal.ZERO,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        BigDecimal total = employees.stream()
                .map(Employee::getSalary)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avg = total.divide(BigDecimal.valueOf(employees.size()), 2, RoundingMode.HALF_UP);

        BigDecimal min = employees.stream()
                .map(Employee::getSalary)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        BigDecimal max = employees.stream()
                .map(Employee::getSalary)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        List<BigDecimal> sortedSalaries = employeeRepository.findAllSalariesOrdered();
        BigDecimal median = calculateMedian(sortedSalaries);

        return new SalarySummaryDTO(
                (long) employees.size(),
                total,
                avg,
                min,
                max,
                median
        );
    }

    public List<DepartmentStatsDTO> getDepartmentStats() {
        return Arrays.stream(Department.values())
                .map(this::calculateDepartmentStats)
                .filter(stats -> stats.getEmployeeCount() > 0)
                .collect(Collectors.toList());
    }

    public DepartmentStatsDTO getDepartmentStats(String departmentName) {
        Department department = Department.valueOf(departmentName.toUpperCase());
        return calculateDepartmentStats(department);
    }

    public List<NewHireDTO> getNewHires(int days) {
        LocalDate since = LocalDate.now().minusDays(days);
        return employeeRepository.findNewHiresSince(since).stream()
                .map(this::toNewHireDTO)
                .collect(Collectors.toList());
    }

    private DepartmentStatsDTO calculateDepartmentStats(Department department) {
        List<Employee> employees = employeeRepository.findByDepartment(department);

        if (employees.isEmpty()) {
            return new DepartmentStatsDTO(department.name(), 0L,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        BigDecimal total = employees.stream()
                .map(Employee::getSalary)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avg = total.divide(BigDecimal.valueOf(employees.size()), 2, RoundingMode.HALF_UP);

        BigDecimal min = employees.stream()
                .map(Employee::getSalary)
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        BigDecimal max = employees.stream()
                .map(Employee::getSalary)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);

        return new DepartmentStatsDTO(
                department.name(),
                (long) employees.size(),
                total,
                avg,
                min,
                max
        );
    }

    private BigDecimal calculateMedian(List<BigDecimal> sortedValues) {
        if (sortedValues.isEmpty()) {
            return BigDecimal.ZERO;
        }
        int size = sortedValues.size();
        if (size % 2 == 0) {
            return sortedValues.get(size / 2 - 1)
                    .add(sortedValues.get(size / 2))
                    .divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        } else {
            return sortedValues.get(size / 2);
        }
    }

    private NewHireDTO toNewHireDTO(Employee employee) {
        long daysSinceHire = java.time.temporal.ChronoUnit.DAYS.between(employee.getHireDate(), LocalDate.now());
        return new NewHireDTO(
                employee.getId(),
                capitalize(employee.getFirstName()),
                capitalize(employee.getLastName()),
                employee.getEmail(),
                employee.getDepartment().name(),
                employee.getHireDate(),
                daysSinceHire
        );
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) {
            return str;
        }
        return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
    }
}
