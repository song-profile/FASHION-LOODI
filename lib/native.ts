"use client";

export async function takeNativePhoto(): Promise<File | null> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera, resultType: CameraResultType.Uri,
    quality: 80, width: 1600, correctOrientation: true, saveToGallery: false,
  });
  if (!photo.webPath) return null;
  const blob = await (await fetch(photo.webPath)).blob();
  return new File([blob], `loodi-${Date.now()}.${photo.format}`, { type: blob.type || `image/${photo.format}` });
}
