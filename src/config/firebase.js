import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, setDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";

const firebaseConfig = {
  apiKey: "AIzaSyAHbTX7t5uzH1zxcPf7KkvLAfHR0MgQKo8",
  authDomain: "chat-app-77738.firebaseapp.com",
  projectId: "chat-app-77738",
  storageBucket: "chat-app-77738.appspot.com",
  messagingSenderId: "920796728650",
  appId: "1:920796728650:web:e9c57f75814dcf29f905b3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const signup = async (username, email, password) => {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      username: username.toLowerCase(),
      email,
      name: "",
      avatar: "",
      bio: "Hey, There I am using chat app",
      lastSeen: Date.now(),
    });
    await setDoc(doc(db, "chats", user.uid), {
      chatsData: [],
    });
    toast.success("User registered successfully!"); // Add a success toast
  } catch (error) {
    console.error("Error during signup:", error);
    toast.error(error.code.split('/')[1].split('-').join(" "));
  }
};

const login = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    toast.success("Login successful!"); 
  } catch (error) {
    console.error("Error during login:", error);
    toast.error(error.code.split('/')[1].split('-').join(" "));
  }
};

const logout = async ()=>{
  try {
    await signOut(auth)
  } catch (error) {
    toast.error(error.code.split('/')[1].split('-').join(" "));
  }
}

const resetPass = async (email) => {
  if (!email) {
    toast.error("Enter your email");
    return null;
  }
  try {
    const userRef = collection(db, "users");
    const q = query(userRef, where("email", "==", email));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset Email Sent");
    } else {
      toast.error("Email doesn't exists");
    }
  } catch (error) {
    console.error(error);
    toast.error(error.message);
  }
};


export { signup, login, logout, auth, db, resetPass };
