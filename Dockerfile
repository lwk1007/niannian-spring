# ---------- 构建阶段 ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY deploy/maven-settings.xml /root/.m2/settings.xml
COPY pom.xml .
RUN mvn -B -q -s /root/.m2/settings.xml dependency:go-offline || true
COPY src ./src
RUN mvn -B -q -s /root/.m2/settings.xml package -DskipTests

# ---------- 运行阶段 ----------
FROM eclipse-temurin:21-jre
ENV TZ=Asia/Shanghai \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1 -XX:MaxMetaspaceSize=160m"
WORKDIR /app
COPY --from=build /src/target/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Duser.timezone=Asia/Shanghai -Dfile.encoding=UTF-8 -Dserver.port=${PORT:-8080} -jar app.jar"]
