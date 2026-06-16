/**
 * Offline Sync Queue — Client-side sync management
 * Handles local persistence, conflict detection, and prioritized sync
 */

export interface SyncEvent {
  id: string;
  type: 'logEntry' | 'task' | 'readinessDeclaration';
  payload: any;
  timestamp: Date;
  priority: 'critical' | 'high' | 'normal';
  synced: boolean;
  serverResponse?: any;
  error?: string;
}

export class SyncQueue {
  private queue: SyncEvent[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.loadFromStorage();
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Add event to queue
   */
  enqueue(
    type: SyncEvent['type'],
    payload: any,
    priority: SyncEvent['priority'] = 'normal'
  ): string {
    const event: SyncEvent = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      payload,
      timestamp: new Date(),
      priority,
      synced: false
    };

    this.queue.push(event);
    this.saveToStorage();
    return event.id;
  }

  /**
   * Sync pending events to server
   */
  async syncPending(apiUrl: string, token: string): Promise<{ success: number; failed: number }> {
    if (!this.isOnline) {
      console.warn('Offline: sync deferred');
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    // Sort by priority (critical first)
    const sorted = this.queue
      .filter(e => !e.synced)
      .sort((a, b) => {
        const priorityMap = { critical: 3, high: 2, normal: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });

    for (const event of sorted) {
      try {
        const response = await fetch(`${apiUrl}/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ events: [event] })
        });

        if (response.ok) {
          const result = await response.json();
          event.synced = true;
          event.serverResponse = result;
          success++;
        } else {
          event.error = `HTTP ${response.status}`;
          failed++;
        }
      } catch (err) {
        event.error = String(err);
        failed++;
      }
    }

    this.saveToStorage();
    return { success, failed };
  }

  /**
   * Get pending sync count
   */
  getPendingCount(): number {
    return this.queue.filter(e => !e.synced).length;
  }

  /**
   * Check for conflicts (manual resolution needed)
   */
  getConflicts(): SyncEvent[] {
    return this.queue.filter(e => e.error?.includes('conflict'));
  }

  /**
   * Resolve conflict by choosing server or local version
   */
  resolveConflict(eventId: string, choice: 'keep' | 'discard') {
    const event = this.queue.find(e => e.id === eventId);
    if (event) {
      if (choice === 'keep') {
        event.error = undefined;
        event.synced = false; // Retry
      } else {
        event.synced = true; // Mark as handled
      }
      this.saveToStorage();
    }
  }

  /**
   * Local storage persistence
   */
  private saveToStorage() {
    try {
      localStorage.setItem('shipman_sync_queue', JSON.stringify(this.queue));
    } catch (err) {
      console.error('Failed to save sync queue:', err);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('shipman_sync_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (err) {
      console.error('Failed to load sync queue:', err);
    }
  }

  /**
   * Network status handlers
   */
  private handleOnline() {
    this.isOnline = true;
    console.log('✓ Online — syncing pending changes...');
    this.syncPending(import.meta.env.VITE_API_URL || '', 'token');
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('✗ Offline — changes queued for sync');
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Clear synced events (archive)
   */
  clearArchive() {
    this.queue = this.queue.filter(e => !e.synced);
    this.saveToStorage();
  }
}

export default new SyncQueue();
