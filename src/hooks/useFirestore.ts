import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, QueryConstraint } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import { StorageService } from '../services/storage';

export function useFirestoreCollection<T>(collectionName: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>(() => {
    try {
      const keyMap: Record<string, string> = {
        'users': 'labmedix_users_v1',
        'patients': 'labmedix_patients_v1',
        'cards': 'labmedix_cards_v1',
        'memberships': 'labmedix_memberships_v1',
        'membershipTiers': 'labmedix_membership_tiers_v1',
        'families': 'labmedix_families_v1',
        'wallets': 'labmedix_wallets_v1',
        'transactions': 'labmedix_transactions_v1',
        'bills': 'labmedix_bills_v1',
        'cardApplications': 'labmedix_portal_card_applications_v1',
        'card_transactions': 'labmedix_card_request_transactions_v1',
        'appointments': 'labmedix_patient_appointments_v1',
        'doctors': 'labmedix_doctor_master_records_v1',
        'vouchers': 'LABMEDIX_CASH_DESK_VOUCHERS_V1'
      };
      const mappedKey = keyMap[collectionName];
      if (mappedKey) {
        return StorageService.getItem<T[]>(mappedKey, []);
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(data.length === 0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: any = null;

    const setupListener = () => {
      try {
        const q = query(collection(db, collectionName), ...constraints);
        
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            if (!isMounted) return;
            const items = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as T[];
            setData(items);
            setLoading(false);
            setError(null);
          },
          (err) => {
            if (!isMounted) return;
            console.warn(`[useFirestoreCollection] Snapshot notice for ${collectionName}:`, err);
            setError(err);
            setLoading(false);
            // Self-healing auto-retry on mobile connection drop
            retryTimeout = setTimeout(() => {
              if (isMounted) setupListener();
            }, 6000);
          }
        );
        return unsubscribe;
      } catch (err: any) {
        console.warn(`[useFirestoreCollection] Query error for ${collectionName}:`, err);
        setError(err);
        setLoading(false);
        return () => {};
      }
    };

    const unsub = setupListener();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (unsub) unsub();
    };
  }, [collectionName]);

  return { data, loading, error };
}
