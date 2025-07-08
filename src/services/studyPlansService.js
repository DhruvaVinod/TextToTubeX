// src/services/studyPlansService.js
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'study-plans';

export const studyPlansService = {
  // Create a new study plan
  async createStudyPlan(userId, planData) {
    try {
      const studyPlan = {
        ...planData,
        userId,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), studyPlan);
      return {
        id: docRef.id,
        ...studyPlan,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating study plan:', error);
      throw new Error('Failed to create study plan');
    }
  },

  // Get all study plans for a user
  async getUserStudyPlans(userId) {
    try {
      console.log(`Fetching plans for user: ${userId}`);
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('lastUpdated', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} plans`);
      
      const plans = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      });
      
      return plans;
    } catch (error) {
      console.error('Firestore error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  // Get a specific study plan
  async getStudyPlan(planId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, planId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || data.lastUpdated
        };
      } else {
        throw new Error('Study plan not found');
      }
    } catch (error) {
      console.error('Error fetching study plan:', error);
      throw new Error('Failed to fetch study plan');
    }
  },

  // Update a study plan
  async updateStudyPlan(planId, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, planId);
      await updateDoc(docRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      });
      
      return {
        id: planId,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating study plan:', error);
      throw new Error('Failed to update study plan');
    }
  },

  // Delete a study plan
  async deleteStudyPlan(planId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, planId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting study plan:', error);
      throw new Error('Failed to delete study plan');
    }
  },

  // Update progress for a study plan
  async updateProgress(planId, progress) {
    try {
      const docRef = doc(db, COLLECTION_NAME, planId);
      await updateDoc(docRef, {
        progress,
        lastUpdated: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw new Error('Failed to update progress');
    }
  },

  // Update completed days for a study plan
  async updateCompletedDays(planId, completedDays) {
    try {
      const docRef = doc(db, COLLECTION_NAME, planId);
      await updateDoc(docRef, {
        completedDays,
        lastUpdated: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating completed days:', error);
      throw new Error('Failed to update completed days');
    }
  },

  // Update day notes for a study plan
  async updateDayNotes(planId, dayNotes) {
    try {
      const docRef = doc(db, COLLECTION_NAME, planId);
      await updateDoc(docRef, {
        dayNotes,
        lastUpdated: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating day notes:', error);
      throw new Error('Failed to update day notes');
    }
  },

  // Update study streak for a study plan
  async updateStudyStreak(planId, studyStreak) {
    try {
      const docRef = doc(db, COLLECTION_NAME, planId);
      await updateDoc(docRef, {
        studyStreak,
        lastUpdated: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating study streak:', error);
      throw new Error('Failed to update study streak');
    }
  },

  // Update audio data for a study plan
  async updateAudioData(planId, audioData, audioType, audioLanguage) {
    try {
      const docRef = doc(db, COLLECTION_NAME, planId);
      await updateDoc(docRef, {
        audioData,
        audioType,
        audioLanguage,
        hasAudio: !!audioData,
        lastUpdated: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating audio data:', error);
      throw new Error('Failed to update audio data');
    }
  },

  // Check if a study plan exists (for checking duplicates)
  async checkExistingPlan(userId, topic, difficulty, totalDays, dailyHours) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('topic', '==', topic),
        where('difficulty', '==', difficulty)
      );
      
      const querySnapshot = await getDocs(q);
      const plans = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.calendar?.totalDays === totalDays && 
            data.calendar?.dailyHours === dailyHours) {
          plans.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || data.lastUpdated
          });
        }
      });
      
      return plans.length > 0 ? plans[0] : null;
    } catch (error) {
      console.error('Error checking existing plan:', error);
      return null;
    }
  }
};