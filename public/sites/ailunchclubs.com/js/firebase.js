
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAN06xThwWu9ZvQmknyMWpfTxciEC0hCO0",
  authDomain: "daves-ai-domains.firebaseapp.com",
  projectId: "daves-ai-domains",
  storageBucket: "daves-ai-domains.firebasestorage.app",
  messagingSenderId: "548620981129",
  appId: "1:548620981129:web:d3bdaf9fa7a906be8d0758",
  measurementId: "G-MMRN4366RR"
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DATABASE ACCESS
window.DB = {
    addProject: async (name) => {
        const user = auth.currentUser;
        if(!user) throw new Error("Must be logged in");
        
        await addDoc(collection(db, "projects"), {
            uid: user.uid,
            name: name,
            createdAt: serverTimestamp()
        });
    },
    getProjects: async () => {
        const user = auth.currentUser;
        if(!user) return [];
        
        const q = query(collection(db, "projects"), where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    }
};

// Global Auth Access for non-module scripts
window.Auth = {
    user: null,
    signInGoogle: async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            return result.user;
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    },
    signInEmail: async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    },
    signUpEmail: async (email, password) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    },
    signOut: async () => {
        await signOut(auth);
        window.location.reload();
    }
};

// Auth State Observer
// Auth State Observer
onAuthStateChanged(auth, (user) => {
    window.Auth.user = user;
    console.log("Auth State:", user ? user.email : "Logged out");
    
    // Dispatch Global Event
    window.dispatchEvent(new CustomEvent('auth-change', { detail: user }));

    // Attempt to update UI if layout is ready
    if(window.updateAuthUI) {
        window.updateAuthUI(user);
    }
    
    // Redirect logic for login page handled by app.js listener now to avoid race conditions
});
