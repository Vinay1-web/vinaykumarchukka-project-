import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, getDocFromServer, doc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { collection, addDoc, query, where, orderBy, onSnapshot, getDocFromServer, doc };

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
