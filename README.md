# AI DevOps Copilot – Backend

This is the backend service for an AI-powered DevOps Copilot system that enables real-time event processing, system observability, and AI-assisted incident response.

Built using Node.js (TypeScript), the backend handles log ingestion, metrics aggregation, webhook event processing, and orchestrates communication with the AI service.

---

## Architecture Overview

The backend is designed as a scalable, event-driven system:

- REST APIs for logs, metrics, and action execution
- Webhook ingestion from GitHub and Docker Hub
- Redis-based queue processing for asynchronous workflows
- PostgreSQL for structured data storage
- Integration with FastAPI AI service for intelligent analysis

---

## Features

- Event-driven architecture using GitHub & Docker Hub webhooks  
- Log ingestion and querying with filtering support  
- Metrics aggregation for system monitoring  
- Redis-based asynchronous job processing (queues & workers)  
- Integration with AI service for log analysis and incident debugging  
- Secure APIs with validation and structured request handling  
- Scalable microservice-friendly design  

---

## API Endpoints

### Logs
- `GET /logs` → Fetch logs with filters (service, level, time range)
- `POST /logs` → Ingest logs

### Metrics
- `GET /metrics` → Retrieve system metrics

### Actions
- `POST /action` → Execute actions (restart service, scale service)

### Webhooks
- `POST /webhooks` → Handle GitHub events (push, workflow, etc.)
- `POST /webhooks/dockerhub` → Handle Docker image events

---

## Event Processing Flow

1. Webhook received (GitHub / Docker Hub)
2. Event pushed to Redis queue
3. Worker processes event asynchronously
4. Data stored in PostgreSQL
5. Optional trigger to AI service for analysis

---

## AI Integration

The backend communicates with a FastAPI-based AI service:

- Sends logs and system context for analysis  
- Receives insights, root-cause suggestions, and actions  
- Supports tool-based execution via controlled endpoints  

---

## Tech Stack

- Node.js (TypeScript)
- Express.js / NestJS
- PostgreSQL
- Redis (Queues & Caching)
- Docker
- Webhooks (GitHub, Docker Hub)