# Lecturer Learning Analytics & Student Risk Prediction System

A full-stack **learning analytics platform** designed to help lecturers analyse assessment performance, identify weak learning chapters, and classify students according to academic risk levels.

This project is developed as my **Final Year Project (FYP)** at Universiti Teknologi PETRONAS.

> 🚧 **Project Status:** Currently in development

---

## Project Purpose

Lecturers often manage assessment results using spreadsheets, which provide marks but limited analytical insight into student learning performance.

This system transforms uploaded assessment data into actionable analytics by providing:

* Assessment performance summaries
* Chapter-level learning analytics
* Strongest and weakest chapter identification
* Student-level performance analysis
* Class-level performance trends
* Machine-learning-based student risk classification

The goal is to support lecturers in identifying learning difficulties earlier and making more informed academic decisions.

---

## Key Features

### Lecturer & Class Management

* Lecturer registration and login
* Lecturer profile management
* Create and manage multiple classes
* Archive completed classes
* Access previous class analyses

### Assessment Data Upload

* Structured Excel assessment template
* Excel structure and data validation
* Flexible assessment configuration
* Automatic coursework processing
* Question-to-chapter mapping
* Assessment and chapter score calculation

### Learning Analytics Dashboard

* Average assessment performance
* Chapter-level class performance
* Strongest and weakest chapters
* Student-level chapter analysis
* Risk-level distribution
* Performance summary visualisations

### Student Risk Prediction

Students are classified into:

* **Low Risk**
* **Medium Risk**
* **High Risk**

Risk prediction uses performance indicators generated from assessment and chapter-level data.

---

## Machine Learning

Three supervised machine learning algorithms were evaluated:

* Logistic Regression
* Random Forest
* Decision Tree

Evaluation methods include:

* Accuracy
* Precision
* Recall
* F1-Score
* 5-Fold Cross-Validation

During model evaluation, **Random Forest achieved approximately 87% test accuracy**, while **Logistic Regression was selected for the current prediction workflow** based on overall model evaluation and cross-validation performance.

The repository also contains a synthetic dataset used for model development and evaluation.

---

## Technology Stack

### Frontend

* React
* JavaScript
* HTML
* CSS
* Vite

### Backend

* Python
* Django
* Django REST Framework
* REST API

### Data Analytics & Machine Learning

* Pandas
* scikit-learn
* Microsoft Excel
* Python-based data processing

### Database

* SQLite

### Development Tools

* Visual Studio Code
* Git
* GitHub
* Figma

---

## Repository Structure

```text
Lecturer-Learning-Analytics/
│
├── backend/
│   ├── analytics_api/
│   ├── config/
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── analytics_processor.py
├── excel_validator.py
├── ml_training.py
├── risk_predictor.py
├── model_metadata.json
│
├── assessment_template.xlsx
├── FYP_ML_Synthetic_Dataset_500_v2_Generic.xlsx
│
├── .gitignore
└── README.md
```

---

## System Workflow

1. Lecturer creates an account and logs into the system.
2. Lecturer creates or selects a class.
3. Assessment data is prepared using the provided Excel template.
4. Lecturer uploads the completed assessment file.
5. The backend validates the uploaded Excel structure and data.
6. Assessment and chapter-level performance metrics are calculated.
7. Machine learning classifies each student's academic risk level.
8. Analytics are presented through the lecturer dashboard.
9. Previous class analyses can be maintained for future reference.

---

## Running the Project Locally

### 1. Clone the Repository

```bash
git clone https://github.com/AinFarisya/Lecturer-Learning-Analytics.git
cd Lecturer-Learning-Analytics
```

---

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory.

Example:

```env
DJANGO_SECRET_KEY=your_django_secret_key
GMAIL_USER=your_email_if_email_features_are_used
GMAIL_APP_PASSWORD=your_app_password_if_required
```

Run database migrations:

```bash
python manage.py migrate
```

Start the Django backend:

```bash
python manage.py runserver
```

The backend will normally run at:

```text
http://127.0.0.1:8000/
```

---

### 3. Frontend Setup

Open another terminal and navigate to:

```bash
cd frontend
```

Install Node.js dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm run dev
```

The frontend will normally run at:

```text
http://localhost:5173/
```

---

## Important Security Note

Sensitive and machine-specific files are intentionally excluded from this public repository using `.gitignore`.

These include:

```text
.env
db.sqlite3
venv/
node_modules/
__pycache__/
*.pkl
```

Environment variables such as the Django secret key and email credentials are **not stored in the public source code**.

Users who clone the repository should create their own local `.env` file before running the backend.

---

## Main Project Files

### `excel_validator.py`

Validates the structure and contents of uploaded assessment Excel files before processing.

### `analytics_processor.py`

Processes assessment information and generates student, assessment, and chapter-level analytics.

### `ml_training.py`

Trains and evaluates the machine learning models used for student risk classification.

### `risk_predictor.py`

Uses the selected machine learning workflow to generate student risk predictions.

### `assessment_template.xlsx`

Provides the structured assessment format used for lecturer data uploads.

### `FYP_ML_Synthetic_Dataset_500_v2_Generic.xlsx`

Synthetic dataset used during machine learning model development and evaluation.

---

## Current Development Focus

The project is currently being improved in the following areas:

* Frontend and backend integration
* Real-time dashboard analytics
* Class-level performance visualisation
* Student risk analysis
* User experience refinement
* System testing and validation

---

## Planned Improvements

Future enhancements may include:

* Cloud deployment
* Enhanced dashboard visualisation
* Downloadable analytics reports
* Additional machine learning evaluation
* More advanced student performance analytics
* Improved authentication and system security

---

## Author

**Nur'Ain Farisya Binti Khairul Nidzar**
Bachelor of Information Technology (Hons.)
Universiti Teknologi PETRONAS

**GitHub:** [AinFarisya](https://github.com/AinFarisya)
**LinkedIn:** [ainfarisya0328](https://linkedin.com/in/ainfarisya0328)
