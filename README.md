# -FitNourish.AI
FitNourish.AI is a mobile-first, AI-powered health and nutrition assistant designed to provide personalized nutrition targets, health insights, and cost-aware food decisions. The system integrates Machine Learning, mobile applications, wearable data concepts, computer vision, and grocery intelligence into

🎯 Project Objective

To provide users with personalized nutrition targets, health insights, and cost-effective food recommendations by intelligently analyzing health data, activity patterns, meal images, and grocery prices.

🧩 Core System Components


1️⃣ AI-Powered Personalized Nutrition & Health Optimization

This component predicts individualized daily nutrition requirements based on user profile, activity, and health conditions.

Key Features

Personalized calorie requirement prediction (kcal/day)

Macronutrient targets:

Protein (g/day)

Carbohydrates (g/day)

Fat (g/day)

Multi-disease aware planning:

Diabetes support

Hypertension support

Goal-based optimization:

Maintain weight

Lose weight

Gain weight

Activity-aware nutrition planning using:

Steps per day

Active minutes

Calories burned during activity

Smartwatch-ready design (heart rate & stress indicators)

Prediction history storage for long-term tracking

Technologies

Machine Learning: Random Forest Regression

Backend: FastAPI (REST API)

Database: PostgreSQL

2️⃣ Smart Grocery Price Optimization & Store Recommendation

This component assists users in making budget-friendly grocery decisions without compromising nutritional value.

Key Features

Real-time grocery price comparison across supermarkets (e.g., Keells, Cargills)

Nutrition-equivalent food substitution (cheaper alternatives with similar nutrients)

Location-aware nearby store recommendations

Price + distance optimization to minimize overall cost

Structured product taxonomy and category-based analysis

Designed specifically for Sri Lankan grocery context

3️⃣ Meal Image Analysis & Intelligent Meal Planning

This component uses computer vision and AI to analyze meals and generate meal plans.

Key Features

Meal image upload and analysis

Ingredient detection with ML confidence scores

Nutrient estimation:

Calories

Proteins

Carbohydrates

Fats

Daily calorie target input

Meal plan generation based on:

Number of meals per day

Calorie distribution

Macronutrient preferences

Adjustable macro and calorie ratios for flexibility

4️⃣ Smart Health Monitoring, Alerts & Insights

This component focuses on continuous health awareness and proactive guidance.

Key Features

Health trend tracking (daily, weekly, monthly)

Risk-level prediction (Low / Medium / High)

Time-based health alerts and reminders

Personalized health guidance and expected benefits

Designed for future wearable device integration

Supports preventive healthcare and habit formation

📱 User Experience & Interface Design

Mobile-first responsive UI (Expo + React Native)

Green-themed professional design aligned with FitNourish.AI branding

Fake demo login and splash screen for presentations

Input validation for realistic and medically meaningful values

Card-based result display for clarity and readability

⚙️ System Architecture

Frontend: React Native (Expo Web)

Backend: FastAPI

Machine Learning: Scikit-learn (Random Forest, MultiOutput Regression)

Database: PostgreSQL

Data Sources: User input, wearable signals, meal images, grocery price data

🚀 Key Strengths

AI-driven personalization in nutrition and healthcare

End-to-end integration of frontend, backend, ML, and database layers

Scalable architecture suitable for real-world deployment

Wearable and IoT-ready system design

Localized for Sri Lankan users and grocery ecosystem

Practical, cost-aware, and health-focused solution

📌 Project Status

Core ML model trained and evaluated (Overall R² ≈ 0.89)

Backend APIs implemented and tested

Mobile frontend demo completed

Grocery optimization and meal analysis designed for extension

Ready for PP2 enhancements and real smartwatch integration

👩‍💻👨‍💻 Contributors

Final Year Undergraduate Project
Sri Lanka Institute of Information Technology (SLIIT)

✅ Badges (FastAPI, ML, PostgreSQL, Expo)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Machine Learning](https://img.shields.io/badge/Machine%20Learning-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)

(Optional extras)
![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

📁 Folder Structure (Add this section)
Edit paths to match your repo name, but here is a clean structure that matches what you already built:
## 📁 Folder Structure

```bash
FitNourish.AI/
├─ backend/                          # FastAPI backend + ML model + DB
│  ├─ app.py                         # API endpoints (predict, predict-and-save, history)
│  ├─ db.py                          # SQLAlchemy DB session
│  ├─ models.py                      # Prediction table model
│  ├─ artifacts/
│  │  └─ nutrition_model.pkl         # Trained ML model
│  ├─ train.py                       # Training script (RandomForest MultiOutput)
│  ├─ requirements.txt               # Backend dependencies
│  └─ README.md (optional)
│
├─ frontend/                         # Expo / React Native (Web + Mobile)
│  └─ nutrition_mobile/
│     ├─ app/
│     │  ├─ (tabs)/
│     │  │  ├─ index.tsx             # Splash -> Login -> Home -> Form flow (UI)
│     │  │  ├─ history.tsx           # History screen
│     │  │  └─ _layout.tsx           # Tab layout
│     │  └─ _layout.tsx
│     ├─ src/
│     │  └─ api/
│     │     └─ client.js             # API calls (predict-and-save, history)
│     ├─ assets/
│     ├─ package.json
│     └─ README.md (optional)
│
├─ images/                           # Screenshots for README
│  ├─ component01_input.png
│  └─ component01_result.png
│
└─ README.md                         # Main project README

## 🚀 Installation & Run Steps (Backend + Frontend)
### 1) Backend (FastAPI + PostgreSQL + ML Model)
## 🚀 Run Backend (FastAPI)
### Prerequisites
- Python 3.8+  
- PostgreSQL installed and running

### Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

Configure Database
Update your PostgreSQL connection in db.py (example):
postgresql://username:password@localhost:5432/fitnourish_db

Run the API
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

✅ Test in browser:


API Home: http://127.0.0.1:8000/
Swagger Docs: http://127.0.0.1:8000/docs
### 2) Frontend (Expo / React Native)
#### Option A — Web (FASTEST for demo)
## 🌐 Run Frontend (Expo Web)
### Prerequisites
- Node.js (LTS)
### Setup
```bash
cd frontend/nutrition_mobile
npm install
npx expo start --web

✅ Web uses:
BASE_URL = "http://127.0.0.1:8000"

because browser runs on the same PC.

#### Option B — Android Emulator (More “real mobile”)

```md
## 📱 Run Frontend (Android Emulator)

### Prerequisites
- Node.js (LTS)
- Android Studio (SDK + Emulator)

### Start
```bash
cd frontend/nutrition_mobile
npm install
npx expo start

Then press: a → open on Android emulator

✅ Emulator uses:
BASE_URL = "http://10.0.2.2:8000"
because emulator maps your PC localhost to 10.0.2.2.

## ✅ Recommended “Run Order” (Always works)


## ✅ Recommended Run Order

1. Start PostgreSQL service
2. Run backend:
   ```bash
   cd backend
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload

Run frontend (web or emulator):
cd frontend/nutrition_mobile
npx expo start --web

Test flow: Splash → Login → Home → Predict & Save → History

