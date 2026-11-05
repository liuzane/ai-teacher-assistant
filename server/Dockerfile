# 运行镜像：Spring Boot 4.x 需要 JDK 17+
FROM eclipse-temurin:17-jre

WORKDIR /app

# 时区
ENV TZ=Asia/Shanghai

# JVM 参数，可在 docker run -e JAVA_OPTS=... 覆盖
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# 镜像默认生产环境，可在 docker run -e SPRING_PROFILES_ACTIVE=dev 覆盖
ENV SPRING_PROFILES_ACTIVE=prod

# 默认使用 Maven 打包产物，可通过 --build-arg JAR_FILE=xxx.jar 覆盖
ARG JAR_FILE=target/aiteacherassistant-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} /app/app.jar

# 与 application.yaml 中的 server.port 保持一致
EXPOSE 8080

# 以非 root 用户运行
RUN useradd -m -u 10001 appuser
USER appuser

# $JAVA_OPTS 需要放在 exec form 之外由 shell 展开
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
