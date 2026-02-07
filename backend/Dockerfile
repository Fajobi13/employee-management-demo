# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# Runtime stage - Distroless for minimal attack surface (no shell, no pkg manager)
# Eliminates Alpine zlib and libexpat CVEs by using patched Debian 12 base
FROM gcr.io/distroless/java21-debian12:nonroot

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
