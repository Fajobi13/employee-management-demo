# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage - Chainguard JRE for zero known CVEs (Wolfi-based, no shell)
FROM cgr.dev/chainguard/jre:latest

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

USER 65532

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
