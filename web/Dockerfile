FROM nginx:alpine

# 后端服务地址，容器内可通过 docker run -e BACKEND_ORIGIN=http://<后端容器名>:8080 覆盖
ENV BACKEND_ORIGIN=http://host.docker.internal:8080

# 使用 nginx 官方镜像的模板机制：entrypoint 会用 envsubst 渲染 /etc/nginx/templates/*.template
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template

COPY ./dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
