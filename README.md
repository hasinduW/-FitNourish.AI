# -FitNourish.AI
FitNourish.AI is a mobile-first, AI-powered health and nutrition assistant designed to provide personalized nutrition targets, health insights, and cost-aware food decisions. The system integrates Machine Learning, mobile applications, wearable data concepts, computer vision, and grocery intelligence into

## 🎯 Project Objective

To provide users with personalized nutrition targets, health insights, and cost-effective food recommendations by intelligently analyzing health data, activity patterns, meal images, and grocery prices.

## 🎯 Project Overview

FitNourish AI is an intelligent, AI-powered nutrition assistant designed to address poor dietary habits and the lack of personalized nutrition guidance in existing health applications. Many current diet and fitness apps rely on static recommendations and fail to adapt to users' real-time health data, leading to ineffective diet planning and long-term health issues.

To overcome these limitations, FitNourish AI integrates machine learning, computer vision, and real-time wellness monitoring to deliver personalized, dynamic, and data-driven dietary advice. The system analyzes user profiles, health goals, dietary preferences, and smartwatch biometrics to generate customized meal plans and proactive health alerts.

The platform also incorporates image processing to analyze food photos and suggest suitable meal options, as well as a smart grocery optimizer that creates cost-effective shopping lists aligned with the user's diet plan. By continuously monitoring lifestyle habits and health indicators, FitNourish AI adapts recommendations in real time, ensuring a holistic and user-centric nutrition solution.

### Project Summary

**Problem Addressed:** Poor dietary habits and lack of personalized, real-time nutrition advice in existing applications

**Research Gap:** Absence of intelligent, adaptive, and holistic nutrition systems that utilize real-time health data

**Proposed Solution:** An AI-driven nutrition assistant that dynamically personalizes diet plans and health recommendations

**Main Objective:** To help users manage health conditions and achieve fitness goals through personalized meal planning, health monitoring, and timely alerts

📦Dependencies

FitNourish.AI is a mobile-first intelligent nutrition & wellness application built using a full-stack architecture consisting of a React Native mobile app, FastAPI backend, and Machine Learning models.


📱 Mobile Application (Frontend)

Built using Expo + React Native to support Android, iOS, and Web (demo).

Core Framework
- expo                  : Cross-platform mobile app framework
- react                 : Component-based UI library
- react-native          : Native mobile UI framework

Navigation
- expo-router                           : File-based routing for Expo apps
- @react-navigation/native              : Navigation container
- @react-navigation/native-stack        : Stack navigation
- @react-navigation/bottom-tabs         : Bottom tab navigation
- @react-navigation/elements            : Shared navigation UI components

UI & Device Features
- @expo/vector-icons     : Icons for mobile UI
- expo-font              : Custom font loading
- expo-image             : Optimized image handling
- expo-haptics           : Haptic feedback
- expo-status-bar        : Status bar control
- expo-splash-screen     : App splash screen
- expo-system-ui         : System UI customization
- expo-web-browser       : In-app browser
- expo-linking           : Deep linking support
- expo-constants         : Access to device/system constants

Mobile Performance & Interaction
- react-native-gesture-handler   : Touch & gesture handling
- react-native-reanimated        : High-performance animations
- react-native-safe-area-context : Safe area handling
- react-native-screens            : Native screen optimization
- react-native-worklets           : Background tasks & performance

Web Support (Demo)
- react-dom
- react-native-web

Development Tools
- typescript           : Static typing
- @types/react         : React type definitions
- eslint               : Code linting
- eslint-config-expo   : Expo ESLint rules


⚙️ Backend (API Layer)

The backend exposes REST APIs for nutrition prediction and data storage.

- FastAPI        : High-performance Python REST API framework
- Uvicorn        : ASGI server for FastAPI
- Pydantic       : Data validation and schema enforcement
- SQLAlchemy     : ORM for database interaction
- psycopg2       : PostgreSQL database driver
- python-dotenv  : Environment variable management
- joblib         : Model serialization & loading


🧠 Machine Learning & Data Processing

Used for training and predicting nutrition targets.

- scikit-learn          : Machine learning algorithms
- RandomForestRegressor : Multi-output regression model
- MultiOutputRegressor  : Predicts calories & macros together
- pandas                : Dataset loading and preprocessing
- numpy                 : Numerical computations


🗄️ Database

- PostgreSQL stores:
  - User inputs
  - Prediction history
  - Nutrition targets


✅ Technology Summary

Frontend   : Expo + React Native (Mobile-first)
Backend    : FastAPI (REST API)
ML         : Scikit-learn (Regression)
Database   : PostgreSQL
Architecture:
Mobile App → FastAPI → ML Model → Database


🧩 Core System Components


🧩 Component 1 – AI-Powered Multi-Disease Adaptive Nutrition & Personalized Health Optimization


This component of FitNourish.AI delivers personalized nutrition recommendations by combining user health profiles, lifestyle data, and machine-learning predictions. It is designed as a mobile-first interface suitable for real-world deployment and academic demonstration.


##📱 Component 01 – Mobile Application Snapshot


<img src="images/Component 01 snapshot.png" width="100%" alt="Component 01 Snapshot" />

FitNourish.AI – Nutrition Profile Input & Prediction Result Interface


📱 Mobile Interface Overview


The FitNourish.AI mobile application consists of two primary screens:

1. Nutrition Profile Input Interface  
2. Nutrition Prediction Result Interface  

These screens guide users through a simple and intuitive workflow — from entering personal health data to receiving AI-generated nutrition insights.


🧑‍⚕️ Nutrition Profile Input Interface


This interface collects essential health, lifestyle, and activity data required for accurate nutrition prediction.

📋 User Inputs

Personal Information
- Age
- Gender (Male / Female)
- Height (cm)
- Weight (kg)

Nutrition Goal
- Maintain weight
- Lose weight
- Gain weight

Health Conditions
- Diabetes (Yes / No)
- Hypertension (Yes / No)

Daily Activity Metrics
- Steps per day
- Active minutes
- Calories burned during activity


🎨 Smart Validation & User Experience (UX)


- Input validation ensures realistic and medically meaningful values
  (e.g., step count limits, numeric constraints)
- Toggle buttons and dropdowns reduce user input errors
- Green-themed UI aligns with the FitNourish.AI brand identity
- Mobile-friendly layout improves clarity, accessibility, and usability


⌚ Smartwatch Data Integration (Demo Logic)


- During initial use, users manually enter activity data
- System is designed for future enhancement to:
  - Automatically fetch data from smartwatch / fitness APIs
  - Periodically sync activity metrics
  - Keep nutrition recommendations continuously updated


📊 Nutrition Prediction Result Interface


After clicking “Predict & Save”, validated input data is sent to the backend AI system for processing.

🤖 AI-Generated Outputs
- Daily calorie requirement (kcal/day)
- Protein requirement (g/day)
- Carbohydrate requirement (g/day)
- Fat requirement (g/day)


⚙️ Model & Backend


- Backend Framework : FastAPI (REST API)
- Machine Learning  : Random Forest Regression (Multi-output)
- Database          : PostgreSQL

Database Stores:
- Prediction history
- User-specific nutrition records


⭐ Key Highlights


- Clear, card-based result presentation
- Macro-nutrients visually separated for readability
- Prediction history stored and retrievable
- Architecture designed for scalability
- Ready for future wearable & health-data integrations


🔁 End-to-End Workflow


1. User opens the FitNourish.AI mobile application
2. Health and activity data are entered or synced
3. Frontend validates the input data
4. Backend AI model processes the data
5. Personalized nutrition targets are generated
6. Results are displayed and stored for future reference


🎯 Purpose of This Component


- AI-driven personalization in healthcare and nutrition
- Seamless integration of:
  - Mobile frontend
  - Backend API
  - Machine learning models
  - Database layer
- Professional, user-centric mobile application design
- Readiness for real-world smartwatch integration

## 📱 Component 02 – Meal Image Analysis & Intelligent Meal Planning

<img src="images/Component 03 snapshot.png" width="450" alt="Component 03 Meal Image Analysis UI" />

This component uses computer vision and AI to analyze meals and generate meal plans.


#### Meal Analysis

1. Click on the Food Analyzer button from user dashboard.
2. Click on the upload area
3. Select a meal image from your device
4. Click "Proceed" button
5. View the results:
   - **Ingredients:** List of detected ingredients with ML confidence scores
   - **Nutrients:** Nutritional breakdown with amounts and percentages
   - **Calories:** Calorie content per 100g

#### Meal Suggestions

1. Click on the Meal Plan Generator button from user dashboard.
2. At the top of the UI , user will be able to see the Daily Calorie Target (eg: 2000 kcal/day)
3. Optionally customize settings:
   - Click the settings icon (⚙️) to adjust:
     - Select the number of meals per day (2, 3, or 4)
     - Calorie distribution ratios across meals
     - Target macro ratios (carbohydrates, proteins, fats)
4. Click "Get Meal Suggestions"
5. Browse through the suggested meals with:
   - Meal images
   - Ingredient lists
   - Nutritional information
   - Calorie content
  
### Key Features

- Meal image upload and analysis
- Ingredient detection with ML confidence scores
- Nutrient estimation:
  - Calories
  - Proteins
  - Carbohydrates
  - Fats
- Daily calorie target input
- Meal plan generation based on:
  - Number of meals per day
  - Calorie distribution
  - Macronutrient preferences
- Adjustable macro and calorie ratios for flexibility

### Technologies

- **Frontend:** React Native
- **Backend:** FastAPI (REST API)
- **Database:** PostgreSQL
- **Machine Learning:** CNN (Convolutional Neural Network) for image analysis
- **Optimization:** Integer Linear Programming (ILP) for meal plan generation

##📲 Component 03 - AI-Powered Predictive Health Alert and Progress Tracking System​

<table>
<tr>
<td width="100%">
  <img src="images/health-risk.jpg" alt="Meal Analysis Interface" />
</td>

</tr>
</table>

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


## 📱 Component 04 – AI-powered Smart Grocery List Optimization and Nearest Store Recommendation.

<table>
<tr>
<td width="100%">
  <img src="images/Component 04 Snapshot.png" alt="Component 04 Smart Grocery List Optimization UI" />
</td>

</tr>
</table>

#### Cheapest & Nearest Store Recommendation

1.Users enter a custom grocery list along with a budget range.

2.The system automatically detects the user’s current location using device location services.

3.Distance from the user’s location to nearby stores is calculated in real time.

4.The system calculates the total cost of the list for each store.

5.Store recommendations are generated by considering:
   - Promotional prices
   - Total cost of the complete grocery list
   - Physical distance from the user to each store
     
6.The app highlights:

    - The best store offering the highest savings
    - Distance to each store from the user
    - Estimated savings amount compared to other stores


#### Nutrition-Aware Substitution

1.When a selected item exceeds the user’s budget, the system suggests cheaper alternatives.

2.Each suggested alternative is evaluated based on:
     - Nutritional similarity (per 100g)
     - Price difference (money saved)
     
3.Nutrition information displayed includes:

     - Energy (kcal)
     - Protein
     - Fat
     - Carbohydrates
     
 4.Similarity levels (High / Medium / Low) help users make informed decisions.


#### Category Browsing & Item Discovery

1.Users can browse grocery categories such as Fruits and Snacks from the home screen.

2.Categories are organized using a rule-based hierarchical structure and Ml Mpdel.

3.Selecting a category allows users to explore related grocery items available across stores.




## ⚙️ System Architecture

Frontend: React Native (Expo Web)

Backend: FastAPI

Machine Learning: Scikit-learn (Random Forest, MultiOutput Regression)

Database: PostgreSQL

Data Sources: User input, wearable signals, meal images, grocery price data

The system architecture of FitNourish AI is illustrated below:

![Architecture Diagram](images/architecture.png)

## 🚀 Key Strengths

AI-driven personalization in nutrition and healthcare

End-to-end integration of frontend, backend, ML, and database layers

Scalable architecture suitable for real-world deployment

Wearable and IoT-ready system design

Localized for Sri Lankan users and grocery ecosystem

Practical, cost-aware, and health-focused solution

## 📌 Project Status

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
cd frontend/nutrition_mobile
npm install
npx expo start --web

✅ Web uses:
BASE_URL = "http://127.0.0.1:8000"

because browser runs on the same PC.

#### Option B — Android Emulator (More “real mobile”)

## 📱 Run Frontend (Android Emulator)

### Prerequisites
- Node.js (LTS)
- Android Studio (SDK + Emulator)

### Start
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
   cd backend
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload

Run frontend (web or emulator):
cd frontend/nutrition_mobile
npx expo start --web

Test flow: Splash → Login → Home → Predict & Save → History

