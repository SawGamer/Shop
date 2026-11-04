# syntax=docker/dockerfile:1.7

# ---- build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests \
    && java -Djarmode=tools -jar target/shop-backend-*.jar extract --layers --launcher --destination /extracted

# ---- runtime ----
FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S shop && adduser -S shop -G shop && mkdir -p /app/data && chown shop:shop /app/data
WORKDIR /app
# Layers ordered from least to most frequently changing, so rebuilds only ship the app layer.
COPY --from=build /extracted/dependencies/ ./
COPY --from=build /extracted/spring-boot-loader/ ./
COPY --from=build /extracted/snapshot-dependencies/ ./
COPY --from=build /extracted/application/ ./
USER shop
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080 8081
HEALTHCHECK --interval=10s --timeout=3s --start-period=90s --retries=6 \
  CMD wget -qO- http://127.0.0.1:8081/actuator/health/readiness >/dev/null || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher"]
