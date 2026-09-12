import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('http') && 
    supabaseAnonKey.length > 20
  );
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }
  return clientInstance;
};

export class SupabaseService {
  /**
   * Check if Supabase PostgreSQL configuration is valid
   */
  public static isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Alias for saveDocument (upsert)
   */
  public static upsertDocument<T = any>(collectionName: string, id: string, payload: T): Promise<boolean> {
    return SupabaseService.saveDocument(collectionName, id, payload);
  }

  /**
   * Fetch all records for a given collection from PostgreSQL
   */
  public static async fetchCollection<T>(collectionName: string): Promise<T[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('labmedix_store')
        .select('id, data')
        .eq('collection_name', collectionName);

      if (error) {
        console.warn(`[Supabase] Error fetching collection '${collectionName}':`, error.message);
        return [];
      }

      if (!data) return [];
      return data.map(row => ({
        id: row.id,
        ...(typeof row.data === 'object' && row.data !== null ? row.data : {})
      })) as unknown as T[];
    } catch (err: any) {
      console.warn(`[Supabase] Unexpected error fetching collection '${collectionName}':`, err);
      return [];
    }
  }

  /**
   * Fetch a single document by collection and ID (or path 'collection/id')
   */
  public static async fetchDocument<T>(docPath: string): Promise<T | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const parts = docPath.split('/');
      const collectionName = parts[0];
      const id = parts.length > 1 ? parts.slice(1).join('/') : 'default';

      const { data, error } = await client
        .from('labmedix_store')
        .select('id, data')
        .eq('collection_name', collectionName)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn(`[Supabase] Error fetching document '${docPath}':`, error.message);
        return null;
      }

      if (!data) return null;
      return {
        id: data.id,
        ...(typeof data.data === 'object' && data.data !== null ? data.data : {})
      } as unknown as T;
    } catch (err) {
      console.warn(`[Supabase] Unexpected error fetching document '${docPath}':`, err);
      return null;
    }
  }

  /**
   * Upsert document into PostgreSQL 'labmedix_store'
   */
  public static async saveDocument<T = any>(
    collectionName: string, 
    id: string, 
    payload: T
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || !collectionName || !id) return false;

    try {
      // Clean undefined and preserve valid JSON
      const cleanData = JSON.parse(JSON.stringify(payload, (_key, val) => 
        val === undefined ? null : val
      ));

      const { error } = await client
        .from('labmedix_store')
        .upsert({
          collection_name: collectionName,
          id: id,
          data: cleanData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'collection_name,id'
        });

      if (error) {
        console.error(`[Supabase] Error saving ${collectionName}/${id}:`, error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error(`[Supabase] Exception saving ${collectionName}/${id}:`, err);
      return false;
    }
  }

  /**
   * Delete document from PostgreSQL 'labmedix_store'
   */
  public static async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || !collectionName || !id) return false;

    try {
      const { error } = await client
        .from('labmedix_store')
        .delete()
        .eq('collection_name', collectionName)
        .eq('id', id);

      if (error) {
        console.error(`[Supabase] Error deleting ${collectionName}/${id}:`, error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error(`[Supabase] Exception deleting ${collectionName}/${id}:`, err);
      return false;
    }
  }

  /**
   * Batch purge collection from PostgreSQL
   */
  public static async purgeCollection(collectionName: string): Promise<number> {
    const client = getSupabaseClient();
    if (!client || !collectionName) return 0;

    try {
      const { data, error } = await client
        .from('labmedix_store')
        .delete()
        .eq('collection_name', collectionName)
        .select('id');

      if (error) {
        console.error(`[Supabase] Error purging collection '${collectionName}':`, error.message);
        return 0;
      }
      return data?.length || 0;
    } catch (err) {
      console.error(`[Supabase] Exception purging collection '${collectionName}':`, err);
      return 0;
    }
  }

  /**
   * Real-time listener on PostgreSQL via Supabase WebSockets (Replication)
   */
  public static subscribeToCollection<T>(
    collectionName: string, 
    callback: (items: T[]) => void
  ): () => void {
    const client = getSupabaseClient();
    if (!client) return () => {};

    // Initial fetch to seed data immediately
    this.fetchCollection<T>(collectionName).then(items => {
      callback(items);
    }).catch(() => {});

    // Create Realtime channel subscription
    const channelName = `realtime_${collectionName}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labmedix_store',
          filter: `collection_name=eq.${collectionName}`
        },
        async () => {
          // Whenever an INSERT, UPDATE, or DELETE happens, re-fetch and update clients
          const latest = await this.fetchCollection<T>(collectionName);
          callback(latest);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[Supabase Realtime] Connected to live channel for '${collectionName}'`);
        }
      });

    return () => {
      try {
        client.removeChannel(channel);
      } catch {}
    };
  }

  /**
   * Diagnostic Ping Test against PostgreSQL
   */
  public static async ping(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, latencyMs: 0, error: 'Supabase credentials not configured in environment.' };
    }

    try {
      const pingId = `ping_${Date.now()}`;
      // Write ping
      const { error: writeError } = await client
        .from('labmedix_store')
        .upsert({
          collection_name: '_system_diagnostics',
          id: pingId,
          data: { ping: true, time: new Date().toISOString() }
        });

      if (writeError) {
        throw new Error(writeError.message);
      }

      // Read ping
      await client
        .from('labmedix_store')
        .select('id')
        .eq('collection_name', '_system_diagnostics')
        .eq('id', pingId)
        .maybeSingle();

      // Delete ping
      client
        .from('labmedix_store')
        .delete()
        .eq('collection_name', '_system_diagnostics')
        .eq('id', pingId)
        .then(() => {});

      const latencyMs = Math.round(performance.now() - start);
      return { success: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { success: false, latencyMs, error: err?.message || String(err) };
    }
  }
}
