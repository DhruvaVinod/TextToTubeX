
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';


const AuthContext = createContext();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const createUserDocument = async (user) => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          emailVerified: user.emailVerified
        });
        console.log('User document created successfully');
      } else {
        
        await setDoc(userDocRef, {
          lastLoginAt: new Date().toISOString(),
          emailVerified: user.emailVerified
        }, { merge: true });
        console.log('User document updated with last login');
      }
    } catch (error) {
      console.error('Error creating/updating user document:', error);
    }
  };

  
  const migrateLocalStorageToFirestore = async (user) => {
    if (!user) return;
    
    try {
      
      const localSummaries = JSON.parse(localStorage.getItem('savedSummaries') || '[]');
      const userSummaries = localSummaries.filter(summary => summary.userId === user.uid);
      
      if (userSummaries.length > 0) {
        console.log(`Migrating ${userSummaries.length} summaries from localStorage to Firestore...`);
        
        
        const { saveSummaryToFirestore } = await import('../services/firestoreServices');
        
        
        for (const summary of userSummaries) {
          try {
            await saveSummaryToFirestore(user.uid, summary);
            console.log(`Migrated summary: ${summary.id}`);
          } catch (error) {
            console.error('Error migrating summary:', summary.id, error);
          }
        }
        
       
        const remainingSummaries = localSummaries.filter(summary => summary.userId !== user.uid);
        localStorage.setItem('savedSummaries', JSON.stringify(remainingSummaries));
        
        console.log('Migration completed successfully');
      }
    } catch (error) {
      console.error('Error during migration:', error);
    }
  };

  
  const logout = async () => {
    try {
      await signOut(auth);
      
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user && user.emailVerified) {
  
        await createUserDocument(user);
        await migrateLocalStorageToFirestore(user);
        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        }));
      } else {
        localStorage.removeItem('user');
      }
      
      setLoading(false);
    });

    //unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    logout,
    isAuthenticated: currentUser && currentUser.emailVerified,
    isLoading: loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};