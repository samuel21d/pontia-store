// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDj_1BBp2nEYt9SlIeCIpKtQf1IW5T__uU",
  authDomain: "catalogo-pontia-store.web.app",
  projectId: "catalogo-pontia-store",
  storageBucket: "catalogo-pontia-store.appspot.com",
  messagingSenderId: "491145201047",
  appId: "1:491145201047:web:28449526025974028070d2",
  measurementId: "G-X92VRVQQGD"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db }; // Exporta db para usarlo en otros archivos
export { app };