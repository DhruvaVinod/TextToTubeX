# 🎬 TextToTubeX 🚀  
*Turn your text into tailored YouTube experiences.*

**TextToTubeX** is a revamped version of our earlier project **TextToTube**.  
Give us a sentence, topic, or idea—and we'll fetch the most relevant YouTube videos to match it!

With a fresh new UI, smoother flow, and deeper personalization, it's your smart gateway to YouTube discovery.

👉 **Live Demo:** [https://deplyment-462519.web.app/](https://deplyment-462519.web.app/)

---

## ✨ Features

- 🔍 **Smart Video Suggestions** – Converts plain text into curated YouTube recommendations.
- 🧠 **Improved Relevance** – Smarter backend logic = better matches.
- 👤 **User Authentication** – Secure Google login/signup with Firebase Auth.
- ☁️ **Cloud Firestore Integration** – Save user history & personalize suggestions.
- 🖥 **Responsive UI** – Built with ReactJS + TailwindCSS for clean, adaptive design.
- ⚡ **Hackathon Ready** – Quick to set up, fun to demo, easy to extend.

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

## 📁 Folder Structure

~~~
TextToTubeX/
├── app/                  # React frontend
├── backend/              # Flask backend
├── public/               # Static files
├── firebase.json         # Firebase project config
├── .firebaserc           # Firebase project alias
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

- 🧠 NLP-powered intent detection
- 📝 Save user history and sessions
- 📈 Admin dashboard with insights
- 🎵 Auto-generated playlists
- 📚 Student mode: Map textbook content to relevant videos

---

🙌 Made with 💻 + ☕ at [GDG Student Challenge + Hack2Skill]  by The pixelators 

Hosted at: https://deplyment-462519.web.app/

Thanks for checking out TextToTubeX! If you liked the project, leave a ⭐ on the repo!
