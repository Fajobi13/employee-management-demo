# Reports Service

Read-only reporting microservice for the Employee Management Application.

## Overview

Provides aggregated reports and analytics from the employee database using a read-only database user.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/reports/department-stats` | Employee count and avg salary by department |
| `GET /api/reports/salary-summary` | Min, max, avg salary statistics |
| `GET /api/reports/headcount` | Headcount trend over time |
| `GET /api/reports/new-hires?days=30` | Recent hires within specified days |
| `GET /actuator/health` | Health check |
| `GET /actuator/prometheus` | Prometheus metrics |

## Security

- Uses read-only MySQL user (`reports_reader`)
- Only SELECT permissions on `employeedb`
- No write access to database
- Separate Vault secret path from backend

## Build

```bash
# Build with Maven
./mvnw clean package -DskipTests

# Build Docker image
docker build -t reports-service:1.0.0 .
```

## Configuration

Environment variables:
- `MYSQL_HOST` - Database host
- `MYSQL_PORT` - Database port (default: 3306)
- `MYSQL_DATABASE` - Database name
- `MYSQL_USER` - Read-only database user
- `MYSQL_PASSWORD` - Database password

## Local Development

```bash
# Run with Docker Compose
docker-compose up reports

# Access Swagger UI
open http://localhost:8081/swagger-ui.html
```
