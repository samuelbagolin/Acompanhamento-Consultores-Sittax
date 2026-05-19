import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  UserCredential
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isAdmin: boolean;
  isGestor: boolean;
  isColaborador: boolean;
  login: (email: string, pass: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        try {
          // Fetch profile
          const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
          if (userDoc.exists()) {
            setUserProfile({ uid: user.uid, ...userDoc.data() } as User);
          } else {
            // Check if super admin to auto-create profile
            if (user.email === 'samuel.bagolin@setuptecnologia.com.br') {
              const newProfile: Omit<User, 'uid'> = {
                nome: 'Samuel Bagolin',
                email: user.email,
                role: 'admin',
                setor: 'Administrativo',
                cargo: 'Administrador',
                liderSetor: true,
                ativo: true,
                fotoURL: `https://ui-avatars.com/api/?name=Samuel+Bagolin&background=random`,
                createdAt: new Date()
              };
              const { setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, 'usuarios', user.uid), newProfile);
              setUserProfile({ uid: user.uid, ...newProfile } as User);
            } else {
              setUserProfile(null);
            }
          }
          
          // subscribe to profile changes
          unsubProfile = onSnapshot(doc(db, 'usuarios', user.uid), (doc) => {
            if (doc.exists()) {
              setUserProfile({ uid: user.uid, ...doc.data() } as User);
            }
          }, (err) => console.error("Profile snapshot error:", err));
          
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    console.log("AUTH METHOD CALLED: signInWithEmailAndPassword", email);
    console.trace();
    return await signInWithEmailAndPassword(auth, email, pass);
  };
  const logout = () => {
    console.log("AUTH METHOD CALLED: signOut");
    return signOut(auth);
  };
  const resetPassword = (email: string) => {
    console.log("AUTH METHOD CALLED: sendPasswordResetEmail", email);
    return sendPasswordResetEmail(auth, email);
  };

  const role = userProfile?.role;
  const value = {
    currentUser,
    userProfile,
    loading,
    isAdmin: role === 'admin',
    isGestor: role === 'lider' || userProfile?.liderSetor === true,
    isColaborador: role === 'colaborador',
    login,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
