import { Network, ConnectionStatus } from '@capacitor/network'
import { Capacitor } from '@capacitor/core'

/**
 * Get current network status
 */
export async function getNetworkStatus(): Promise<ConnectionStatus> {
  if (Capacitor.isNativePlatform()) {
    return await Network.getStatus()
  } else {
    // Web fallback
    return {
      connected: navigator.onLine,
      connectionType: navigator.onLine ? 'wifi' : 'none',
    }
  }
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const status = await getNetworkStatus()
  return status.connected
}

/**
 * Add listener for network status changes
 * Returns a cleanup function to remove the listener
 */
export function addNetworkListener(callback: (status: ConnectionStatus) => void): () => void {
  if (Capacitor.isNativePlatform()) {
    const listener = Network.addListener('networkStatusChange', callback)
    return () => listener.remove()
  } else {
    // Web fallback
    const onlineHandler = () => {
      callback({ connected: true, connectionType: 'wifi' })
    }
    const offlineHandler = () => {
      callback({ connected: false, connectionType: 'none' })
    }

    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)

    return () => {
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
    }
  }
}

/**
 * Check connection type (wifi, cellular, none, unknown)
 */
export async function getConnectionType(): Promise<string> {
  const status = await getNetworkStatus()
  return status.connectionType
}
