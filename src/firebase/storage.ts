import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export const uploadProductImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `products/${timestamp}_${cleanName}`;
    const storageRef = ref(storage, fileName);

    // 30 soniya timeout
    const timeoutId = setTimeout(() => {
      reject(new Error('TIMEOUT: Rasm yuklash 30 soniyadan oshdi. Firebase Storage rules ni tekshiring.'));
    }, 30000);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Yuklash: ${progress.toFixed(0)}%`);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('Storage xato:', error.code, error.message);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};
export const uploadReceiptImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `receipts/${timestamp}_${cleanName}`;
    const storageRef = ref(storage, fileName);

    const timeoutId = setTimeout(() => {
      reject(new Error('TIMEOUT: Rasm yuklash 30 soniyadan oshdi.'));
    }, 30000);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // progress
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
};
