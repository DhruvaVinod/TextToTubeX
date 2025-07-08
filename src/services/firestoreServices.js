import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

// Save summary
export const saveSummaryToFirestore = async (userId, summaryData) => {
  try {
    console.log('Saving summary to Firestore for user:', userId);
    
    // Add the summary to the 'summaries' collection
    const docRef = await addDoc(collection(db, 'summaries'), {
      ...summaryData,
      userId, // Ensure userId is included
      createdAt: summaryData.createdAt || new Date().toISOString()
    });
    
    console.log('Summary saved with ID:', docRef.id);
    
    // Return the saved summary with its Firestore ID
    return {
      id: docRef.id,
      firestoreId: docRef.id,
      ...summaryData
    };
  } catch (error) {
    console.error('Error saving summary to Firestore:', error);
    throw error;
  }
};

// Get summaries
export const getSummariesFromFirestore = async (userId) => {
  if (!userId) return [];

  const q = query(
    collection(db, "summaries"),
    where("userId", "==", userId)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    firestoreId: doc.id,
    ...doc.data()
  }));
};

// Delete summary
export const deleteSummaryFromFirestore = async (userId, summaryId) => {
  if (!userId || !summaryId) return;
  await deleteDoc(doc(db, "summaries", summaryId));
};