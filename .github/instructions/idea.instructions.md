---
description: I am creating and learning microservices 
---

## Features 

My Plan is I want to create a microservice for each of the following functionalities.
I want to just a todo application with the following functionalities:
1. User Management: This microservice will handle user registration, authentication, and profile management.
2. Task Management: This microservice will manage the creation, updating, and deletion of tasks. It will also handle task assignment and tracking.
3. Notification Service: This microservice will be responsible for sending notifications to users about task updates, deadlines, and other relevant events.
4. Reporting Service: This microservice will generate reports based on user activity, task completion rates, and other relevant metrics.
5. API Gateway: This microservice will act as a single entry point for all client requests and will route requests to the appropriate microservices. It will also handle authentication and rate limiting.
6. Database Service: This microservice will manage the database interactions for all other microservices, ensuring data consistency and integrity across the application.
7. Logging Service: This microservice will handle logging for all other microservices, providing a centralized location for monitoring and debugging the application.
8. Search Service: This microservice will provide search functionality for tasks, allowing users to easily find specific tasks based on keywords, tags, or other criteria.
9. Analytics Service: This microservice will analyze user behavior and task data to provide insights and recommendations for improving productivity and task management.
10. Integration Service: This microservice will handle integration with third-party services such as calendar applications, email services, and other productivity tools to enhance the functionality of the todo application.  

## Stacks Phase 1
- Programming Language - TypeScript
- Backend Framework - Nest JS Typescript
- Frontend Framework - React JS with Typescript
- All Dependencies must be open source and free to use.
- DB - MongoDB
- API - Nest JS Graphql 
- Graphql Apollo Server 
- Apollo Federation. One single API playground for all graphql microservices
- Authentication - JWT
- API gateway - [traefik](https://github.com/traefik/traefik) which can connect with the all microservices microservice.
- Logging - [winston] File based logging for all microservices
- Containerization - Docker
- Orchestration - Kubernetes
- I want to deploy the kubernetes cluster on Local system using kubectl in the first phase 
- I want to deploy all docker images in docker hub and then pull those images in kubernetes cluster for deployment.
- For local development, I want to use docker compose to run single microservices.
- I want to use prometheus and grafana for monitoring the microservices and visualize the metrics in grafana dashboard.
- I want to implement Unit testing for all microservices using Jest
- I want to implement E2E testing for all microservices using Playwright
- I want to use Argo CD for continuous deployment of microservices to Kubernetes cluster.


## Stacks Phase 2
- I want to use AWS for hosting the microservices in production environment.