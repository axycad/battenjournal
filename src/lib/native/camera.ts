import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

/**
 * Take a photo using the device camera
 * Falls back to web file input on non-native platforms
 */
export async function takePicture(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return takePhotoWeb()
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    })

    return image.dataUrl || null
  } catch (error) {
    console.error('Failed to take picture:', error)
    return null
  }
}

/**
 * Pick a photo from the device gallery
 * Falls back to web file input on non-native platforms
 */
export async function pickPhoto(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return takePhotoWeb()
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    })

    return image.dataUrl || null
  } catch (error) {
    console.error('Failed to pick photo:', error)
    return null
  }
}

/**
 * Web fallback for photo capture/selection
 */
function takePhotoWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' as any

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
      } else {
        resolve(null)
      }
    }

    input.oncancel = () => resolve(null)
    input.click()
  })
}

/**
 * Check if camera is available
 */
export function isCameraAvailable(): boolean {
  return Capacitor.isNativePlatform() || ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)
}
