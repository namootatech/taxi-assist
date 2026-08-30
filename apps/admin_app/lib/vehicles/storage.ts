/** Bucket for a document file path (vehicle photos vs general docs). */
export function storageBucketForPath(filePath: string) {
  const parts = filePath.split('/');
  if (parts.length >= 4 && parts[1] === 'vehicle') {
    const file = parts[3] ?? '';
    if (
      file.startsWith('front_') ||
      file.startsWith('left_') ||
      file.startsWith('right_') ||
      file.startsWith('rear_') ||
      file.startsWith('speedo_')
    ) {
      return 'vehicle-photos';
    }
  }
  return 'driver-documents';
}
