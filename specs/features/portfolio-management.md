# Feature Specification: Portfolio Management System

## 1. Feature Overview

The Portfolio Management System is the core feature that allows users to add, configure, and manage their GPU hardware within the GPUScout platform. This system is the foundation for all personalized analytics, recommendations, and alerts.

## 2. User Stories

- **US-004: Portfolio Creation**: As an individual GPU host (Alex), I want to create a portfolio representing my GPU setup so that I can track performance and get optimization recommendations.
- **US-005: GPU Configuration Management**: As a small farm operator (Maria), I want to configure individual GPU instances with custom settings so that I can optimize each GPU for maximum profitability.
- **US-006: Portfolio Performance Dashboard**: As a GPU host, I want to see real-time performance metrics for my entire portfolio so that I can monitor health and identify optimization opportunities.

## 3. API Specification

All endpoints are prefixed with `/api/v1`. Authentication is required for all endpoints.

### Portfolios

#### `POST /portfolios`
- **Description**: Create a new portfolio.
- **Request Body**:
  ```json
  {
    "name": "My First Rig",
    "description": "Primary gaming and AI training rig."
  }
  ```
- **Response (201 Created)**: The newly created portfolio object.
- **Business Logic**: Free tier users are limited to 1 portfolio.

#### `GET /portfolios`
- **Description**: List all portfolios for the authenticated user.
- **Response (200 OK)**: An array of portfolio objects.

#### `GET /portfolios/{portfolioId}`
- **Description**: Get a single portfolio by its ID, including its GPU instances.
- **Response (200 OK)**: A single portfolio object with a nested `gpus` array.

#### `PUT /portfolios/{portfolioId}`
- **Description**: Update a portfolio's name or description.
- **Request Body**:
  ```json
  {
    "name": "Main AI Rig",
    "description": "Updated description."
  }
  ```
- **Response (200 OK)**: The updated portfolio object.

#### `DELETE /portfolios/{portfolioId}`
- **Description**: Delete a portfolio and all its associated GPU instances.
- **Response (204 No Content)**.

### GPU Instances

#### `POST /portfolios/{portfolioId}/gpus`
- **Description**: Add one or more GPU instances to a portfolio.
- **Request Body**:
  ```json
  {
    "gpuModel": "RTX 4090",
    "quantity": 2,
    "customNamePrefix": "Rig 1 - GPU"
  }
  ```
- **Response (201 Created)**: An array of the newly created GPU instance objects.
- **Business Logic**: Creates `quantity` number of individual GPU instance records.

#### `GET /portfolios/{portfolioId}/gpus/{gpuId}`
- **Description**: Get a single GPU instance by its ID.
- **Response (200 OK)**: The GPU instance object.

#### `PUT /portfolios/{portfolioId}/gpus/{gpuId}`
- **Description**: Update a GPU instance's settings.
- **Request Body**:
  ```json
  {
    "customName": "Rig 1 - Main Card",
    "platformInstanceId": "vast-12345",
    "settings": {
      "coreClockOffset": 150,
      "memoryClockOffset": 1000,
      "powerLimit": 350
    }
  }
  ```
- **Response (200 OK)**: The updated GPU instance object.

#### `DELETE /portfolios/{portfolioId}/gpus/{gpuId}`
- **Description**: Remove a GPU instance from a portfolio.
- **Response (204 No Content)**.

## 4. Component Specification

### Component: `PortfolioDashboard`
- **Purpose**: The main view for displaying all user portfolios and high-level metrics.
- **Props**: None (fetches data internally).
- **State**: List of portfolios, loading state, error state.
- **Features**:
  - Displays a summary card for each portfolio.
  - "Create New Portfolio" button.
  - Links to individual portfolio detail pages.

### Component: `PortfolioDetailView`
- **Purpose**: Displays detailed metrics and GPU instances for a single portfolio.
- **Props**: `portfolioId: string`.
- **State**: Portfolio data, list of GPU instances, chart data, loading/error states.
- **Features**:
  - Renders key performance charts (Revenue, Utilization, etc.).
  - Lists all GPU instances in a table.
  - "Add GPU" and "Edit Portfolio" buttons.

### Component: `PortfolioCreateModal`
- **Purpose**: A modal dialog for creating a new portfolio.
- **Props**: `isOpen: boolean`, `onClose: () => void`, `onSuccess: (newPortfolio) => void`.
- **State**: Form fields for `name` and `description`, validation errors, submission state.

### Component: `GpuInstanceForm`
- **Purpose**: A form (modal or inline) for adding or editing a GPU instance.
- **Props**: `portfolioId: string`, `gpuInstance?: GpuInstance` (for editing), `onSuccess: () => void`.
- **State**: Form fields for `gpuModel`, `quantity` (add only), `customName`, `settings`, etc.

## 5. Data Models

```typescript
interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  gpus?: GpuInstance[]; // Included in detailed view
}

interface GpuInstance {
  id: string;
  portfolioId: string;
  gpuModel: string; // e.g., "RTX 4090"
  customName: string | null;
  platformInstanceId: string | null;
  settings: { [key: string]: any } | null; // For overclock, etc.
  createdAt: string;
  updatedAt: string;
}
```