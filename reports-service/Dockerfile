# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom.xml first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -B

# Runtime stage - Chainguard JRE for zero known CVEs (Wolfi-based, no shell)
FROM cgr.dev/chainguard/jre:latest

WORKDIR /app

COPY --from=build /app/target/reports-service-1.0.0.jar app.jar

USER 65532

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
