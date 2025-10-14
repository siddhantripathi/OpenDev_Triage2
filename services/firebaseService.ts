import {
  signInWithCredential,
  GoogleAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserAnalysis, RepoData, AnalysisIssue } from '../types';

export class FirebaseService {
  static async signInWithGoogle(idToken: string): Promise<FirebaseUser> {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return result.user;
  }

  static async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  static onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  }

  static async createOrUpdateUser(user: FirebaseUser): Promise<void> {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        attemptsLeft: 5,
        createdAt: new Date(),
      });
    }
  }

  static async getUser(uid: string): Promise<User | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  }

  static async updateUserGitHubToken(uid: string, token: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
      githubToken: token,
    });
  }

  static async decrementUserAttempts(uid: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
      attemptsLeft: increment(-1),
    });
  }

  static async saveAnalysis(
    uid: string,
    repoData: RepoData,
    analysisResult: AnalysisIssue
  ): Promise<string> {
    const analysisData: Omit<UserAnalysis, 'id'> = {
      userId: uid,
      repoData,
      analysisResult,
      createdAt: new Date(),
      attempts: 1,
    };

    const docRef = await addDoc(collection(db, 'analyses'), analysisData);
    return docRef.id;
  }

  static async getUserAnalyses(uid: string, limitCount: number = 10): Promise<UserAnalysis[]> {
    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', uid),
      // Temporarily disabled until Firebase index is created
      // Re-enable this after creating the composite index: userId (Ascending) + createdAt (Descending)
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const analyses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as UserAnalysis[];
    
    // Sort in memory as a temporary workaround
    return analyses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static async canUserAnalyze(uid: string): Promise<boolean> {
    const user = await this.getUser(uid);
    return user ? user.attemptsLeft > 0 : false;
  }
}
