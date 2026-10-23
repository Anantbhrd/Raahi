# RAAHI
# Real-time Arrival and Attendance Hub via IoT

Raahi is a comprehensive full-stack application designed to track bus locations, calculate Estimated Time of Arrival (ETA), provide route recommendations, and simulate bus movements across campus routes. 

## 🚀 Features

*   **Real-Time Tracking:** Monitor bus locations along campus routes.
*   **ETA Calculation:** Accurate Estimated Time of Arrival predictions powered by our custom ETA engine.
*   **Route Recommendations:** Intelligent suggestions for optimal routes.
*   **Simulation Engine:** Built-in simulator for testing and demonstrating bus movements.
*   **Admin Dashboard:** Backend endpoints for device management and system administration.

## 🛠️ Tech Stack

### Frontend
*   **Framework:** React (TypeScript)
*   **Build Tool:** Vite
*   **Icons:** Lucide React
*   **Styling:** CSS/Tailwind (Configured via Vite)

### Backend
*   **Server:** Node.js with Express.js
*   **Language:** TypeScript
*   **Database:** SQLite (`bus_tracker.db`, `smartbus.db`)
*   **Testing:** Vitest, Supertest
*   **Utilities:** dotenv, cors, nanoid, cuid2

## 📁 Project Structure

```text
├── backend/
│   ├── data/
│   │   ├── bus_tracker.db
│   │   └── smartbus.db
│   ├── src/
│   │   ├── config.ts
│   │   ├── index.ts
│   │   ├── db/
│   │   │   ├── database.ts
│   │   │   ├── reset.ts       # Database reset script
│   │   │   └── seed.ts        # Database seeding script
│   │   ├── engine/
│   │   │   ├── campusRoutes.ts
│   │   │   ├── eta.ts         # ETA calculation logic
│   │   │   ├── recommendation.ts
│   │   │   └── simulator.ts   # Bus movement simulation
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── routes/
│   │       ├── admin.ts
│   │       ├── api.test.ts
│   │       ├── device.ts
│   │       └── public.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
└── frontend/
    ├── dist/                # Production build
    ├── src/
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

## ⚙️ Setup and Installation

### Prerequisites
*   Node.js (v16 or higher)
*   npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd smartbus-tracker
```

### 2. Backend Setup
```bash
cd backend
npm install

# Set up the environment variables
cp .env.example .env

# Initialize and seed the database
npm run db:reset
npm run db:seed

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
# Open a new terminal
cd frontend
npm install

# Start the Vite development server
npm run dev
```

## 🧪 Testing

The backend utilizes `vitest` for unit and integration testing.

```bash
cd backend
npm run test
```
*Tests cover core engine functionalities including ETA calculations and recommendations.*

## 🛣️ Core Engine Modules

*   **`simulator.ts`**: Mocks live GPS data for buses moving along defined campus routes.
*   **`eta.ts`**: Analyzes distance, traffic, and route data to predict arrivals.
*   **`recommendation.ts`**: Recommends the fastest bus or route for a user based on their current location and destination.
*   **`campusRoutes.ts`**: Stores geospatial data and stops for the campus transit system.
