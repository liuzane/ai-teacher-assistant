pipeline {
  agent any

  tools {
    nodejs 'NodeJS-24'
    jdk 'JDK-17'
    maven 'Maven-3.9.16'
  }

  // parameters {
  //   booleanParam(name: 'DEPLOY_DOCKER', defaultValue: true, description: '是否部署 Docker 容器（取消勾选则只构建不部署）')
  //   string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker 镜像标签')
  // }

  environment {
    // 后端
    SERVER_IMAGE = "ai-teacher-assistant-server:latest"
    SERVER_CONTAINER = 'ai-teacher-assistant-server'

    // 前端
    WEB_IMAGE = "ai-teacher-assistant-web:latest"
    WEB_CONTAINER = 'ai-teacher-assistant-web'

    // 网络
    APP_NETWORK = 'app_network'
  }

  stages {
    stage('拉取代码') {
      steps {
        checkout scm
      }
    }

    stage('前端：依赖与构建') {
      steps {
        dir('web') {
          script {
            echo 'Node.js 版本: ' + sh(script: 'node -v', returnStdout: true).trim()
            echo 'npm 版本: ' + sh(script: 'npm -v', returnStdout: true).trim()

            sh '''
              rm -rf node_modules
              npm install
              npm run build
            '''
          }
        }
      }
    }

    stage('后端：Maven 构建') {
      steps {
        dir('server') {
          script {
            echo 'Java 版本: ' + sh(script: 'java -version 2>&1', returnStdout: true).trim()

            sh '''
              mvn -B -DskipTests clean package
            '''
          }
        }
      }
    }

    stage('构建 Docker 镜像') {
      steps {
        // 后端镜像（构建上下文为 server/，Dockerfile 中 COPY target/...）
        sh """
          docker build -t ${SERVER_IMAGE} -f server/Dockerfile server/
        """

        // 前端镜像（构建上下文为 web/，Dockerfile 中 COPY dist/ 和 nginx.conf）
        sh """
          docker build -t ${WEB_IMAGE} -f web/Dockerfile web/
        """

        // 清理悬空镜像
        sh 'docker image prune -f'
      }
    }

    stage('重启 Docker 容器') {
      when {
        expression { return params.RESTART_DOCKER }
      }
      steps {
        script {
          // 容器由服务器上的 docker-compose 创建和管理，
          // 这里只重启现有容器，不重建，避免出现与 compose 配置不一致的容器
          sh "docker restart ${APP_CONTAINER}"
        }
      }
    }
  }

  post {
    success {
      script {
        if (params.RESTART_DOCKER) {
          echo "========== 重启成功 =========="
          echo "后端容器: ${SERVER_CONTAINER}"
          echo "镜像: ${SERVER_IMAGE}"
          echo "日志: docker logs ${SERVER_CONTAINER} --tail 20"
          echo "前端容器: ${WEB_CONTAINER}"
          echo "镜像: ${WEB_IMAGE}"
          echo "日志: docker logs ${WEB_CONTAINER} --tail 20"
        } else {
          echo '========== 构建成功（已跳过重启）=========='
        }
      }
    }
    failure {
      echo '========== 构建/部署失败 =========='
      echo '请检查上方日志'
    }
  }
}
