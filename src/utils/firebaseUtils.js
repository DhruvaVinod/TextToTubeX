// src/utils/firebaseUtils.js
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// Collection references
const USERS_COLLECTION = 'users';
const QUIZ_RESULTS_COLLECTION = 'quiz_results';

// Create or update user profile
export const createUserProfile = async (user, additionalData = {}) => {
  if (!user) return null;
  
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const userSnapshot = await getDoc(userRef);
  
  if (!userSnapshot.exists()) {
    const { displayName, email } = user;
    const createdAt = serverTimestamp();
    
    try {
      await setDoc(userRef, {
        displayName,
        email,
        createdAt,
        quizScores: [],
        totalQuizzes: 0,
        averageScore: 0,
        badges: {},
        ...additionalData
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
  
  return userRef;
};

// Get user profile data
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      return { id: userSnapshot.id, ...userSnapshot.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Save quiz result
export const saveQuizResult = async (userId, quizData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      const newQuizScores = [...(userData.quizScores || []), quizData.percentage];
      const newTotalQuizzes = (userData.totalQuizzes || 0) + 1;
      const newAverageScore = newQuizScores.reduce((sum, score) => sum + score, 0) / newQuizScores.length;
      
      // Update user profile with new quiz data
      await updateDoc(userRef, {
        quizScores: newQuizScores,
        totalQuizzes: newTotalQuizzes,
        averageScore: Math.round(newAverageScore * 100) / 100,
        lastQuizDate: serverTimestamp()
      });
      
      // Create detailed quiz result record
      const quizResultRef = doc(collection(db, QUIZ_RESULTS_COLLECTION));
      await setDoc(quizResultRef, {
        userId,
        topic: quizData.topic,
        level: quizData.level,
        language: quizData.language,
        score: quizData.score,
        totalQuestions: quizData.totalQuestions,
        percentage: quizData.percentage,
        badgeEarned: quizData.badgeEarned,
        createdAt: serverTimestamp()
      });
      
      return {
        newAverageScore: Math.round(newAverageScore * 100) / 100,
        totalQuizzes: newTotalQuizzes,
        quizScores: newQuizScores
      };
    }
    throw new Error('User profile not found');
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }
};

// Get leaderboard data
export const getLeaderboard = async () => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy('averageScore', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const leaderboard = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.totalQuizzes > 0) { // Only include users who have taken quizzes
        leaderboard.push({
          id: doc.id,
          name: data.displayName || 'Anonymous',
          score: data.averageScore || 0,
          quizCount: data.totalQuizzes || 0,
          isCurrentUser: false // This will be set in the component
        });
      }
    });
    
    // Add rank to each player
    return leaderboard.map((player, index) => ({
      ...player,
      rank: index + 1
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

// Update user badges
export const updateUserBadges = async (userId, badgeData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      [`badges.${badgeData.key}`]: {
        ...badgeData,
        earnedAt: serverTimestamp()
      }
    });
  } catch (error) {
    console.error('Error updating user badges:', error);
    throw error;
  }
};

// Get user's quiz history
export const getUserQuizHistory = async (userId) => {
  try {
    const quizResultsRef = collection(db, QUIZ_RESULTS_COLLECTION);
    const q = query(
      quizResultsRef, 
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const quizHistory = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === userId) {
        quizHistory.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return quizHistory;
  } catch (error) {
    console.error('Error getting quiz history:', error);
    throw error;
  }
};