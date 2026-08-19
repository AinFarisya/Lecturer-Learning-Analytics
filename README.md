# Lecturer Learning Analytics & Student Risk Prediction System

A web-based learning analytics platform designed to help lecturers analyze student assessment performance, identify weak learning areas, and predict students who may be academically at risk.

This project is developed as my **Final Year Project (FYP)** at Universiti Teknologi PETRONAS.

## Project Overview

Traditional assessment records often provide lecturers with students' marks but limited analytical insight into learning performance.

This system allows lecturers to upload assessment data and automatically generate analytics related to:

* Student assessment performance
* Chapter-level performance
* Strongest and weakest learning chapters
* Student academic risk levels
* Class-level performance trends

The system also applies machine learning to support early identification of students who may require additional academic attention.

## Key Features

### Lecturer & Class Management

* Lecturer registration and login
* Multiple classes under individual lecturer accounts
* Add and manage classes
* Archive completed classes
* Maintain class analysis history

### Assessment Data Processing

* Upload assessment data using Excel
* Automatic Excel structure validation
* Flexible number of tests and quizzes
* Automatic coursework calculations
* Question-to-chapter mapping

### Learning Analytics

* Assessment performance analysis
* Chapter-level performance analysis
* Identification of strongest and weakest chapters
* Class performance summaries
* Student-level analytics

### Student Risk Prediction

* Machine learning-based student risk classification
* Risk categories:

  * Low Risk
  * Medium Risk
  * High Risk
* Risk prediction based primarily on test performance and learning-performance indicators

## Machine Learning

Three machine learning algorithms were evaluated:

* Logistic Regression
* Random Forest
* Decision Tree

Model evaluation includes:

* Accuracy
* Precision
* Recall
* F1-Score
* Cross-validation

During model comparison, the Random Forest model achieved approximately **87% test accuracy**, while Logistic Regression was selected for the current prediction workflow based on overall model evaluation considerations.

## Technology Stack

**Frontend**

* React
* JavaScript
* HTML
* CSS
* Vite

**Backend**

* Python
* Django
* Django REST Framework

**Data Processing & Machine Learning**

* Pandas
* scikit-learn
* Microsoft Excel

**Database**

* SQLite

**Development Tools**

* Visual Studio Code
* Git
* GitHub
* Figma

## System Workflow

1. Lecturer creates an account and logs into the system.
2. Lecturer creates or selects a class.
3. Assessment Excel file is uploaded.
4. The system validates the uploaded data.
5. Assessment and chapter-level analytics are calculated.
6. Machine learning predicts student risk levels.
7. Results are displayed through interactive dashboards.
8. Previous analyses can be accessed through class history.

## Project Status

🚧 **Currently in Development**

Current development focuses on completing the frontend interface, integrating analytics with the backend, and finalizing the lecturer dashboard and student risk analytics.

## Future Improvements

* More advanced learning analytics
* Additional machine learning model evaluation
* Improved data visualization
* Exportable analytics reports
* Enhanced lecturer dashboard features
* Cloud deployment

## Author

**Nur'Ain Farisya Binti Khairul Nidzar**
Bachelor of Information Technology (Hons.)
Universiti Teknologi PETRONAS

LinkedIn: https://linkedin.com/in/ainfarisya0328
