# Phish Hunter - AI-Powered Threat Detection & Remediation

Phish Hunter is a professional-grade cybersecurity command center designed to intercept, analyze, and neutralize phishing threats across multiple mobile communication channels in real-time.

## 🚀 Core Technologies & Languages

- **TypeScript**: The primary programming language used for robust, type-safe application logic.
- **React 18**: The front-end framework used for building the dynamic, component-based user interface.
- **Tailwind CSS**: A utility-first CSS framework used for all styling, including the "Brutalist" high-contrast design system.
- **Vite**: The build tool and development server providing fast Hot Module Replacement (HMR).

## 🧠 Artificial Intelligence

- **Google Gemini 3 Flash**: The core AI engine used for deep content analysis and risk assessment.
- **Google Search Grounding**: Integrated via the Gemini SDK to provide real-time threat intelligence by fetching the latest cybersecurity trends from the web.
- **AI-Powered Remediation**: Automated logic that generates safe alternatives and mitigation steps for detected threats.

## 🛠️ Tools & Libraries

- **@google/genai**: The official SDK for integrating Gemini's multimodal and search capabilities.
- **Lucide React**: A comprehensive library of beautiful, consistent icons used throughout the dashboard.
- **Framer Motion (motion/react)**: Used for all high-performance animations, transitions, and the "Live Sync" visual effects.
- **Firebase (Firestore & Auth)**:
  - **Firestore**: Used as the real-time database for storing scan history and threat logs.
  - **Firebase Authentication**: Provides secure Google Login integration.
- **NPM**: The package manager used for dependency management.

## 🛡️ Key Features

- **Multi-Channel Interception**: Automatically monitors SMS, Email, URLs, App Notifications, and Phone Calls.
- **System Auto-Pilot**: Background AI engine that automatically scans and rectifies high-risk threats.
- **Real-Time Threat Feed**: Live intelligence on emerging phishing tactics powered by Google Search.
- **Integrated Notification Bar**: A system-level UI component that visualizes the "Interception → Analysis → Completion" pipeline.
- **Security Audit Logs**: A terminal-style log providing a detailed record of all automated security actions.

## 📦 Project Structure

- `/src/App.tsx`: The main application logic and UI orchestration.
- `/src/services/geminiService.ts`: Integration with the Gemini AI API.
- `/src/lib/firebase.ts`: Firebase initialization and database configuration.
- `/src/index.css`: Global styles and Tailwind configuration.
- `firestore.rules`: Security rules for the cloud database.
- `firebase-blueprint.json`: The data schema definition for the Firebase backend.
