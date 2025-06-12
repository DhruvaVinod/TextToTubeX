# 🎬 TextToTubeX 🚀  

With a fresh new UI, smoother flow, and deeper personalization, **TextToTubeX** is your smart gateway to YouTube discovery. 

Give us a sentence, topic, or idea—and we'll fetch the most relevant YouTube videos to match it!

👉 **Live Demo:** [https://deplyment-462519.web.app/](https://deplyment-462519.web.app/)

---

## ✨ Features

- 🔍 **Smart Video Suggestions** – Converts plain text into curated YouTube recommendations.
- 🧠 **Improved Relevance** – Smarter backend logic = better matches.
- 👤 **User Authentication** – Secure Google login/signup with Firebase Auth.
- ☁️ **Cloud Firestore Integration** – Save user history & personalize suggestions.
- 🖥 **Responsive UI** – Built with ReactJS + TailwindCSS for clean, adaptive design.

---

## ⚙️ Tech Stack

| Layer       | Tech Used                |
|-------------|--------------------------|
| **Frontend** | ReactJS, TailwindCSS     |
| **Backend**  | Flask (Python)           |
| **Database** | Firebase Firestore       |
| **Auth**     | Firebase Authentication  |
| **Hosting**  | Firebase (frontend), Google Cloud SDK + Docker (backend) |

---

## 🚀 Getting Started

Before you begin, make sure you have:

- [Node.js & npm](https://nodejs.org/)
- [Python 3.x](https://www.python.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

### 1. Clone the Repository
~~~bash
git clone https://github.com/your-username/TextToTubeX.git
cd TextToTubeX
~~~

### 2. Install Frontend Dependencies
~~~bash
npm install
~~~

### 3. Install Firebase Tools (if not already installed)
~~~bash
npm install -g firebase-tools
~~~

### 4. Install Backend Dependencies
~~~bash
cd backend
pip install -r requirements.txt
~~~

### 5. Run the App

**Frontend:**
~~~bash
npm start
~~~

**Backend:**
~~~bash
cd backend
python app.py
~~~

---

### 🔐 Firebase Setup

This project uses **Firebase Authentication** and **Cloud Firestore**.

You’ll need to:

- ✅ Enable **Google Authentication** in your [Firebase Console](https://console.firebase.google.com/)
- ✅ Create a **Cloud Firestore** database
- ✅ Add your Firebase config to the frontend:

📄 **Create this file:** `src/firebaseConfig.js`

~~~js
// src/firebaseConfig.js

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

export default firebaseConfig;
~~~

🔒 **Optional (Backend Setup)** – If you use Firebase Admin SDK:

~~~python
import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate("path/to/your-service-account.json")
firebase_admin.initialize_app(cred)
~~~

---

## 🔑 API Keys Required
To use all features of TextToTubeX, you'll need to set up the following API keys:

- **Gemini API Key** – Used for AI-generated summaries and quizzes.
  - You'll need a **Gemini Pro** account to access advanced features.
- **YouTube Data API Key** – Used to fetch relevant YouTube videos based on topics.

We recommend storing these keys securely using `.env` files or your deployment environment's secrets manager.

## 📁 Folder Structure

~~~
TextToTubeX/
├── app/                  # React frontend
├── backend/              # Flask backend
├── public/               # Static files
├── firebase.json         # Firebase project config
├── .firebaserc           # Firebase project alias
├── .env                  # For api keys 
└── README.md             # This file!

~~~

---

## 🤝 Contributing

Got a cool feature idea? Fork the repo, build something awesome, and send us a pull request!

~~~bash
git checkout -b feature/yourFeature
git commit -m "Add your feature"
git push origin feature/yourFeature
~~~

Then open a pull request 🚀

---

## 💡 Future Improvements

🤝 Collaborative Study Groups
Enable users to form or join groups, share notes, discuss quizzes, and collaborate on study plans.

🎙️ Voice Input & Output
Allow voice-based input and audio summaries/quizzes to improve accessibility.

🧩 Customizable Quiz Types
Support formats like fill-in-the-blanks, drag-and-drop, and flashcards.

📊 Study Suggestions
Analyze quiz performance to recommend topics users should focus on.

👩‍🏫 Teacher Dashboard
Let educators track student usage, content generated, and quiz performance.

📄 PDF Upload Support
Enable uploading and processing of PDF files in addition to images.

---

🙌 Made with 💻 + ☕ at [GDG Student Challenge + Hack2Skill]  by The pixelators 

Hosted at: https://deplyment-462519.web.app/

Thanks for checking out TextToTubeX! If you liked the project, leave a ⭐ on the repo!
