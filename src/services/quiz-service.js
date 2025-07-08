// quiz-service.js
import { collection, addDoc, doc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// Function to update user's average score
export const updateUserAverage = async (userId) => {
  try {
    // Get all quiz results for this user
    const resultsQuery = query(
      collection(db, 'quiz-results'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(resultsQuery);
    
    if (querySnapshot.empty) {
      console.log('No quiz results found for user');
      return;
    }
    
    // Calculate average score
    let totalScore = 0;
    let totalQuestions = 0;
    let quizCount = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      totalScore += data.score;
      totalQuestions += data.totalQuestions;
      quizCount++;
    });
    
    const averageScore = totalScore / totalQuestions;
    const averagePercentage = (averageScore * 100) / (totalQuestions / quizCount);
    
    // Update user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      averageScore: averageScore,
      averagePercentage: Math.round(averagePercentage * 100) / 100
    });
    
    console.log('User average updated successfully');
    
  } catch (error) {
    console.error('Error updating user average:', error);
    throw error;
  }
};

// Function to check and award badges
export const checkAndAwardBadges = async (userId) => {
  try {
    // Get user's current data
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('User document not found');
      return;
    }
    
    const userData = userDoc.data();
    const averagePercentage = userData.averagePercentage || 0;
    
    // Define badge thresholds (adjust these based on your badge system)
    const badgeThresholds = {
      bronze: 60,
      silver: 70,
      gold: 80,
      platinum: 90
    };
    
    // Determine which badges user has earned
    const earnedBadges = [];
    if (averagePercentage >= badgeThresholds.bronze) earnedBadges.push('bronze');
    if (averagePercentage >= badgeThresholds.silver) earnedBadges.push('silver');
    if (averagePercentage >= badgeThresholds.gold) earnedBadges.push('gold');
    if (averagePercentage >= badgeThresholds.platinum) earnedBadges.push('platinum');
    
    // Update user's badges
    await updateDoc(userRef, {
      badges: earnedBadges,
      lastBadgeUpdate: new Date()
    });
    
    console.log('User badges updated:', earnedBadges);
    
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
    throw error;
  }
};

// Function to update leaderboard
export const updateLeaderboard = async () => {
  try {
    // Get all users ordered by average score
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('averagePercentage', 'desc'),
      limit(100) // Limit to top 100 users
    );
    
    const querySnapshot = await getDocs(usersQuery);
    
    if (querySnapshot.empty) {
      console.log('No users found for leaderboard');
      return;
    }
    
    // Create leaderboard data
    const leaderboardData = [];
    let rank = 1;
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      leaderboardData.push({
        userId: doc.id,
        rank: rank,
        averageScore: userData.averagePercentage || 0,
        totalQuizzes: userData.totalQuizzes || 0,
        badges: userData.badges || [],
        lastActive: userData.lastActive
      });
      rank++;
    });
    
    // Store leaderboard in a dedicated collection
    const leaderboardRef = doc(db, 'leaderboards', 'global');
    await updateDoc(leaderboardRef, {
      data: leaderboardData,
      lastUpdated: new Date()
    });
    
    console.log('Leaderboard updated successfully');
    
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    throw error;
  }
};

export const submitQuizResult = async (userId, quizId, quizData) => {
  const resultId = Date.now().toString();
  
  try {
    await runTransaction(db, async (transaction) => {
      // Store quiz result
      const resultRef = doc(db, 'quiz-results', resultId);
      transaction.set(resultRef, {
        userId,
        quizId,
        score: quizData.score,
        totalQuestions: quizData.totalQuestions,
        percentage: (quizData.score / quizData.totalQuestions) * 100,
        timeTaken: quizData.timeTaken,
        answers: quizData.answers,
        completedAt: new Date()
      });

      // Update user statistics
      const userRef = doc(db, 'users', userId);
      transaction.update(userRef, {
        totalQuizzes: increment(1),
        totalScore: increment(quizData.score),
        lastActive: new Date()
      });

      // Update quiz statistics
      const quizRef = doc(db, 'quizzes', quizId);
      transaction.update(quizRef, {
        totalAttempts: increment(1)
      });
    });

    // Update user average and badges after transaction
    await updateUserAverage(userId);
    await checkAndAwardBadges(userId);
    await updateLeaderboard();
    
    return resultId;
  } catch (error) {
    console.error('Error submitting quiz result:', error);
    throw error;
  }
};