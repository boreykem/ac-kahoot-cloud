/**
 * Compresses an image file on the client-side before uploading or converting to base64.
 * Returns a Promise that resolves to a compressed base64 string.
 *
 * @param {File} file - The image file from the input element
 * @param {number} maxWidth - Maximum width of the compressed image
 * @param {number} maxHeight - Maximum height of the compressed image
 * @param {number} quality - Image quality (0 to 1)
 * @returns {Promise<string>} Base64 data URL of the compressed image
 */
export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    // Only process image files
    if (!file.type.startsWith('image/')) {
      reject(new Error("File is not an image"));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Draw image on canvas and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Output as JPEG to ensure small size (PNGs ignore the quality param)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = (error) => reject(error);
    };
    
    reader.onerror = (error) => reject(error);
  });
};
