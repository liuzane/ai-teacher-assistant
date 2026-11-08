pipeline {
  agent any

  tools {
    nodejs 'NodeJS-24'
    jdk 'JDK-17'
    maven 'Maven-3.9.16'
  }

  environment {
    // 后端
    SERVER_IMAGE = "ai-teacher-assistant-server:${params.IMAGE_TAG}"

    // 前端
    WEB_IMAGE = "ai-teacher-assistant-web:${params.IMAGE_TAG}"
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

            sh 'mvn -B -DskipTests clean package'
          }
        }
      }
    }

    stage('构建 Docker 镜像') {
      steps {
        // 构建后端镜像
        sh 'docker build -t ${SERVER_IMAGE} -f server/Dockerfile server/'

        // 构建前端镜像
        sh 'docker build -t ${WEB_IMAGE} -f web/Dockerfile web/'

        // 清理悬空镜像
        sh 'docker image prune -f'
      }
    }

    stage('重建 Docker 容器') {
      when {
        expression { return params.REBUILD_DOCKER_CONTAINER }
      }
      steps {
        script {
          sh 'docker compose up -d --build'
        }
      }
    }
  }

  post {
    success {
      script {
        if (params.REBUILD_DOCKER_CONTAINER) {
          echo "========== 重建成功 =========="
        } else {
          echo '========== 构建成功（已跳过重建）=========='
        }
        echo "后端镜像: ${SERVER_IMAGE}"
        echo "前端镜像: ${WEB_IMAGE}" 
      }
    }
    failure {
      echo '========== 构建失败 =========='
      echo '请检查上方日志'
    }
  }
}
