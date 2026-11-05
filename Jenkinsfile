pipeline {
  agent any

  tools {
    nodejs 'NodeJS-24'
    jdk 'JDK-17'
    maven 'Maven-3.9.16'
  }

  environment {
    // 后端
    SERVER_IMAGE = "ai-teacher-assistant-server:latest"

    // 前端
    WEB_IMAGE = "ai-teacher-assistant-web:latest"
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

  }

  post {
    success {
      echo '========== 构建成功 =========='
      echo "后端镜像: ${SERVER_IMAGE}"
      echo "前端镜像: ${WEB_IMAGE}"
    }
    failure {
      echo '========== 构建失败 =========='
      echo '请检查上方日志'
    }
  }
}
