# Fitness Villa — Frontend

Modern, high-performance web dashboard and landing page for **Fitness Villa** (Elite Strength & Performance Club).

## 🚀 Tech Stack
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Vanilla CSS with modern dark/neon-green theme, custom responsive grids & cards
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router v7

## 📦 Features
- **Public Website**: Hero, plans & pricing overview, facility showcases, enquiry submission.
- **Role-Based Auth & Navigation**: Admin, Staff, Trainer, and Member views.
- **Admin & Staff Management**:
  - Member management (Add, Edit, View profile, Status tracking)
  - Membership lifecycle & plan assignments
  - QR & Manual Attendance tracking
  - Payment processing & receipt generation
  - Enquiries pipeline
  - Expense tracking & Inventory management
  - Visual analytics, revenue & attendance reports
- **Member & Trainer Portal**: Workout plans, progress tracking, membership status.

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `VITE_API_URL` points to your backend API:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
The app will be accessible at `http://localhost:5173`.

### 5. Build for Production
```bash
npm run build
```
Production output will be generated in `dist/`.
