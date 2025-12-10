pipeline {
    agent any

    environment {
        AWS_ACCOUNT_ID      = "183295421833"
        AWS_DEFAULT_REGION  = "ap-south-2"

        FRONTEND_ECR_URI    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/niri-frontend-dev"
        FRONTEND_DOCKERFILE = "Dockerfile"
        FRONTEND_TAG        = "latest"

        FRONTEND_SERVICE    = "niri-frontend-dev"
        FRONTEND_CLUSTER    = "niri-dev"
        FRONTEND_TASKDEF    = "niri-frontend-dev:4"
    }

    options {
        timestamps()
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm

                sh '''
                    echo "Branch:"
                    git rev-parse --abbrev-ref HEAD

                    echo "Latest Commit:"
                    git log -1 --pretty=oneline
                '''
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_DEFAULT_REGION} \
                    | docker login --username AWS --password-stdin \
                    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com
                """
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                sh """
                    docker build \
                        -f ${FRONTEND_DOCKERFILE} \
                        -t ${FRONTEND_ECR_URI}:${FRONTEND_TAG} .
                """
            }
        }

        stage('Push Docker Image') {
            steps {
                sh "docker push ${FRONTEND_ECR_URI}:${FRONTEND_TAG}"
            }
        }

        stage('Deploy to ECS') {
            steps {
                sh """
                    aws ecs update-service \
                        --cluster ${FRONTEND_CLUSTER} \
                        --service ${FRONTEND_SERVICE} \
                        --task-definition ${FRONTEND_TASKDEF} \
                        --force-new-deployment \
                        --region ${AWS_DEFAULT_REGION}
                """
            }
        }

        stage('Cleanup') {
            steps {
                sh "docker rmi ${FRONTEND_ECR_URI}:${FRONTEND_TAG} || true"
                cleanWs()
            }
        }
    }

    post {
        always {
            echo "Frontend Build Status: ${currentBuild.currentResult}"
        }
    }
}
