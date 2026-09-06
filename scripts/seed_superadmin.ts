import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const databaseId = config.firestoreDatabaseId || 'ai-studio-labmedixautoheal-1ac13548-bbcc-4f91-96bd-c8c990bec0c8';

const app = initializeApp(config);
const db = getFirestore(app, databaseId);

async function main() {
  const email = 'angadmandal3@gmail.com';
  const password = 'Angad@1999';
  const fullName = 'Angad Mandal';
  const username = 'angadmandal3@gmail.com';

  const superAdminData = {
    id: 'usr_super_admin',
    staffId: 'LMDX-STF-001',
    employeeNo: 'LMDX-EMP-001',
    username: username,
    fullName: fullName,
    email: email,
    role: 'super_admin',
    companyId: 'LABMEDIX-MAIN-CLINIC',
    designation: 'Chief Medical Director & System Owner',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    bloodGroup: 'O+',
    phone: '+91 98300 00001',
    workPhone: 'EXT-101 (Executive)',
    department: 'Executive Medical Board',
    accessZone: 'Zone ROOT: Full Medical, OT, ICU & Root Server Access',
    nationalId: 'UID-8821-9940-1120',
    licenseNo: 'WBMC-DIR-0091',
    emergencyContact: '9830099999',
    emergencyContactName: 'Executive Secretariat',
    cardThemeWish: 'premium_medical',
    cardMaterialWish: 'gold_foil',
    status: 'active',
    pinCode: password,
    password: password,
    joiningDate: '2025-01-01',
    expiryDate: '2028-12-31',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  };

  // 1. Sync to local central store JSON
  const centralStorePath = path.join(process.cwd(), 'data', 'labmedix_central_store.json');
  if (fs.existsSync(centralStorePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(centralStorePath, 'utf8'));
      if (Array.isArray(data.users)) {
        const idx = data.users.findIndex((u: any) => u.id === 'usr_super_admin' || u.role === 'super_admin');
        if (idx !== -1) data.users[idx] = { ...data.users[idx], ...superAdminData };
        else data.users.unshift(superAdminData);
      }
      if (Array.isArray(data.labmedix_users_v1)) {
        const idx = data.labmedix_users_v1.findIndex((u: any) => u.id === 'usr_super_admin' || u.role === 'super_admin');
        if (idx !== -1) data.labmedix_users_v1[idx] = { ...data.labmedix_users_v1[idx], ...superAdminData };
        else data.labmedix_users_v1.unshift(superAdminData);
      }
      if (data.labmedix_current_user_v1) {
        data.labmedix_current_user_v1 = { ...data.labmedix_current_user_v1, ...superAdminData };
      }
      fs.writeFileSync(centralStorePath, JSON.stringify(data, null, 2), 'utf8');
      console.log('✅ Updated data/labmedix_central_store.json successfully.');
    } catch (e: any) {
      console.warn('⚠️ Central store file update notice:', e.message);
    }
  }

  // 2. Attempt Firestore Cloud Sync with a timeout
  console.log('Connecting to Cloud Firestore for /users/usr_super_admin ...');
  try {
    const userDocRef = doc(db, 'users', 'usr_super_admin');
    const writePromise = setDoc(userDocRef, superAdminData, { merge: true });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore operation timed out (Database not initialized or offline)')), 5000)
    );

    await Promise.race([writePromise, timeoutPromise]);
    console.log('✅ Successfully written to Firestore collection /users/usr_super_admin!');

    const snapshot = await getDoc(userDocRef);
    console.log('Firestore verification read:', snapshot.exists() ? 'RECORD_VERIFIED' : 'NOT_FOUND');
  } catch (err: any) {
    console.warn('ℹ️ Cloud Firestore write note:', err?.message || err);
    console.log('Note: If Firestore database (default) is not yet created in Firebase Console, the app will automatically seed and sync upon connection.');
  }
}

main().then(() => {
  console.log('Super Admin Setup complete.');
  process.exit(0);
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
