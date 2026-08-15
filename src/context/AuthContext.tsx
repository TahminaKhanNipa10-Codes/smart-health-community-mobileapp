import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
} from "firebase/auth";

import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  FieldValue,
} from "firebase/firestore";

import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from "../firebase/config";
import firebaseConfig from "../../firebase-applet-config.json";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "user" | "doctor" | "admin";
  age: number | "";
  gender: "Male" | "Female" | "Other" | "";
  height: number | "";
  weight: number | "";
  bloodGroup: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";
  phoneNumber: string;
  address: string;
  emergencyContact: string;
  createdAt: FieldValue | string;
  updatedAt: FieldValue | string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserProfile | null;
  loading: boolean;

  registerWithEmail: (
    email: string,
    password: string,
    displayName: string,
    role?: "user" | "doctor",
  ) => Promise<any>;

  loginWithEmail: (email: string, password: string) => Promise<any>;

  loginWithGoogle: () => Promise<any>;

  logout: () => Promise<void>;

  resetPassword: (email: string) => Promise<void>;

  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  const [userData, setUserData] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);

  // Initialize native Google Sign-In on Android
  useEffect(() => {
    const initializeGoogleSignIn = async () => {
      if (Capacitor.getPlatform() === "android") {
        try {
          await GoogleSignIn.initialize({
            clientId: firebaseConfig.oAuthClientId,
          });

          console.log("Google Sign-In initialized successfully.");
        } catch (error) {
          console.error("Google Sign-In initialization error:", error);
        }
      }
    };

    initializeGoogleSignIn();
  }, []);

  // Synchronize Firestore user data role and profile information
  async function fetchUserData(uid: string) {
    const userDocPath = `users/${uid}`;

    try {
      const docRef = doc(db, "users", uid);

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserProfile);
      } else {
        setUserData(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, userDocPath);
    }
  }

  // Handle standard registration
  async function registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    role: "user" | "doctor" = "user",
  ) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    const user = userCredential.user;

    // Create initial user document in Firestore
    const userDocPath = `users/${user.uid}`;

    const initialProfile: UserProfile = {
      uid: user.uid,
      email: user.email || email,
      name: displayName || "",
      role: role,
      age: "",
      gender: "",
      height: "",
      weight: "",
      bloodGroup: "",
      phoneNumber: "",
      address: "",
      emergencyContact: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const userDocRef = doc(db, "users", user.uid);

      await setDoc(userDocRef, initialProfile);

      setUserData(initialProfile);

      return userCredential;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userDocPath);
    }
  }

  // Handle standard login
  function loginWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Handle Google Sign-In
  async function loginWithGoogle() {
    let result: any;

    // Android Native Google Sign-In
    if (Capacitor.getPlatform() === "android") {
      const googleResult = await GoogleSignIn.signIn();

      if (!googleResult.idToken) {
        throw new Error("Google Sign-In did not return an ID token.");
      }

      const credential = GoogleAuthProvider.credential(googleResult.idToken);

      result = await signInWithCredential(auth, credential);
    }

    // Web Google Sign-In
    else {
      const { signInWithPopup } = await import("firebase/auth");

      result = await signInWithPopup(auth, googleProvider);
    }

    const user = result.user;

    const userDocPath = `users/${user.uid}`;

    try {
      const docRef = doc(db, "users", user.uid);

      const docSnap = await getDoc(docRef);

      // Create profile for new Google user
      if (!docSnap.exists()) {
        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email || "",
          name: user.displayName || "",
          role: "user",
          age: "",
          gender: "",
          height: "",
          weight: "",
          bloodGroup: "",
          phoneNumber: user.phoneNumber || "",
          address: "",
          emergencyContact: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(docRef, initialProfile);

        setUserData(initialProfile);
      }

      // Existing Google user
      else {
        setUserData(docSnap.data() as UserProfile);
      }

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userDocPath);
    }
  }

  // Logout
  function logout() {
    return signOut(auth);
  }

  // Password reset
  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  // Firebase authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          await fetchUserData(user.uid);
        } catch (error) {
          console.error("Auth initialization error loading user data:", error);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,

    registerWithEmail,

    loginWithEmail,

    loginWithGoogle,

    logout,

    resetPassword,

    refreshUserData: () => fetchUserData(currentUser?.uid || ""),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
