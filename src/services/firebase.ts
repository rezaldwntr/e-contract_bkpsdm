import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  writeBatch, // Penting untuk update massal
  setDoc,     // Penting untuk menimpa data (Update)
  deleteDoc   // Opsional
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { Employee } from "@/lib/types";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton App Instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- SERVICE FIRESTORE ---
export const FirebaseFirestore = {
  // 1. Ambil Data Pegawai
  getEmployees: async (): Promise<Employee[]> => {
    const querySnapshot = await getDocs(collection(db, "employees"));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Employee[];
  },

  // 2. Tambah Pegawai dengan LOGIKA ANTI-DUPLIKAT (Upsert)
  addEmployees: async (employees: Employee[]) => {
    const batch = writeBatch(db);
    
    employees.forEach((emp) => {
      // VALIDASI ID: Gunakan NIP sebagai ID Dokumen
      // Jika NIP ada isinya, gunakan sebagai ID. Jika kosong, buat ID acak.
      const docId = (emp.niPppk && emp.niPppk.length > 5) 
        ? emp.niPppk.trim() 
        : doc(collection(db, "employees")).id;

      const docRef = doc(db, "employees", docId);
      
      // LOGIKA UPDATE:
      // setDoc dengan { merge: true } artinya:
      // - Jika ID (NIP) belum ada -> Buat Data Baru.
      // - Jika ID (NIP) sudah ada -> Timpa data lama dengan data baru (Update).
      batch.set(docRef, {
        ...emp,
        updatedAt: new Date().toISOString(),
      }, { merge: true }); 
    });

    await batch.commit();
  },

  // 3. Ambil Template (Untuk fitur upload template)
  getTemplates: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "templates"));
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting templates:", error);
      return [];
    }
  },

  // 4. Simpan Metadata Template
  saveTemplateMetadata: async (type: 'penuh' | 'paruh', metadata: any) => {
    await setDoc(doc(db, "templates", type), {
      ...metadata,
      updatedAt: new Date().toISOString(),
    });
  }
};

// --- SERVICE STORAGE ---
export const FirebaseStorage = {
  uploadTemplate: async (file: File, type: 'penuh' | 'paruh') => {
    const fileName = type === 'penuh' ? 'template_pk_penuh.docx' : 'template_pk_paruh.docx';
    const storageRef = ref(storage, `templates/${fileName}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      await FirebaseFirestore.saveTemplateMetadata(type, {
        name: type === 'penuh' ? 'PK Penuh Waktu' : 'PK Paruh Waktu',
        fileName: file.name,
        fileUrl: url,
        type: type,
        size: snapshot.metadata.size,
        contentType: snapshot.metadata.contentType
      });
      return url;
    } catch (error) {
      console.error("Upload Error:", error);
      throw error;
    }
  },

  getTemplateUrl: async (type: 'penuh' | 'paruh') => {
    const fileName = type === 'penuh' ? 'template_pk_penuh.docx' : 'template_pk_paruh.docx';
    const storageRef = ref(storage, `templates/${fileName}`);
    try {
      return await getDownloadURL(storageRef);
    } catch (error) {
      return null;
    }
  }
};