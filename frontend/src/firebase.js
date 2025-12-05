import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBTumaS4mkNW1FZDq06fYvHm5J9oiz779w",
    authDomain: "bsg-gurukul.firebaseapp.com",
    projectId: "bsg-gurukul",
    storageBucket: "bsg-gurukul.firebasestorage.app",
    messagingSenderId: "597222051278",
    appId: "1:597222051278:web:b642210ec39e16c20bef9f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
