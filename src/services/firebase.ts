import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  setDoc, // Kita butuh ini untuk update data berdasarkan ID (penuh/paruh)
  Timestamp 
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

// --- SERVICE FIRESTORE (DATABASE) ---
export const FirebaseFirestore = {
  // Ambil Data Pegawai
  getEmployees: async (): Promise<Employee[]> => {
    const querySnapshot = await getDocs(collection(db, "employees"));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Employee[];
  },

  // Tambah Data Pegawai
  addEmployees: async (employees: Employee[]) => {
    const batchPromises = employees.map((emp) => {
      return addDoc(collection(db, "employees"), {
        ...emp,
        createdAt: new Date().toISOString(),
      });
    });
    await Promise.all(batchPromises);
  },

  // [BARU] Ambil Data Template (Fix Error Anda)
  getTemplates: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "templates"));
      // Kita kembalikan array objek template
      return querySnapshot.docs.map((doc) => ({
        id: doc.id, // 'penuh' atau 'paruh'
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting templates:", error);
      return []; // Return array kosong jika error agar tidak crash
    }
  },

  // [BARU] Simpan Metadata Template
  saveTemplateMetadata: async (type: 'penuh' | 'paruh', metadata: any) => {
    // Gunakan setDoc agar kita menimpa data berdasarkan ID (tidak duplikat)
    await setDoc(doc(db, "templates", type), {
      ...metadata,
      updatedAt: new Date().toISOString(),
    });
  }
};

// --- SERVICE STORAGE (FILE) ---
export const FirebaseStorage = {
  uploadTemplate: async (file: File, type: 'penuh' | 'paruh') => {
    // 1. Upload File ke Storage
    const fileName = type === 'penuh' ? 'template_pk_penuh.docx' : 'template_pk_paruh.docx';
    const storageRef = ref(storage, `templates/${fileName}`);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      // 2. [TAMBAHAN] Simpan Info ke Firestore agar bisa diambil oleh getTemplates()
      await FirebaseFirestore.saveTemplateMetadata(type, {
        name: type === 'penuh' ? 'PK Penuh Waktu' : 'PK Paruh Waktu',
        fileName: file.name, // Nama asli file user
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
      console.warn("Template belum diupload:", fileName);
      return null;
    }
  }
};