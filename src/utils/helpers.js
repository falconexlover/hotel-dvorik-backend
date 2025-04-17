/**
 * Извлекает Public ID из URL изображения Cloudinary.
 * Пример URL: http://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.jpg
 * @param {string} imageUrl URL изображения
 * @returns {string | null} Public ID или null, если извлечь не удалось
 */
const extractPublicId = (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return null;
    }
    try {
        // Ищем последнюю часть URL после '/' и удаляем расширение файла
        const parts = imageUrl.split('/');
        const lastPart = parts[parts.length - 1];
        const publicIdWithExtension = lastPart;

        // Ищем последнюю точку, чтобы отделить расширение
        const dotIndex = publicIdWithExtension.lastIndexOf('.');
        if (dotIndex === -1) {
            // Если точки нет, возможно, это уже public_id (например, после трансформации)
            // Или это может быть невалидный URL. В базовой версии вернем как есть.
            // Более надежно - искать по наличию версии vXXXXX или папки.
            // Пример: ищем `/v\d+/`
            const versionMatch = imageUrl.match(/\/v\d+\/(.+)/);
            if (versionMatch && versionMatch[1]) {
                 // Удаляем расширение, если оно есть
                 const potentialId = versionMatch[1];
                 const lastDot = potentialId.lastIndexOf('.');
                 return lastDot === -1 ? potentialId : potentialId.substring(0, lastDot);
            } else {
                 // Пытаемся извлечь ID между последними двумя слешами
                 const lastSlash = imageUrl.lastIndexOf('/');
                 if (lastSlash > 0) {
                    const secondLastSlash = imageUrl.lastIndexOf('/', lastSlash - 1);
                    if (secondLastSlash > 0) {
                        const potentialId = imageUrl.substring(secondLastSlash + 1, lastSlash);
                         // Проверка, что это не просто папка (без точки)
                         if (potentialId.lastIndexOf('.') === -1) {
                             return potentialId;
                         }
                    }
                 }
                 // Если ничего не нашли, возвращаем null
                 console.warn("Не удалось извлечь Public ID из URL:", imageUrl);
                 return null;
            }
           
        }

        const publicId = publicIdWithExtension.substring(0, dotIndex);
        
        // Дополнительно: убедимся, что мы взяли правильную часть, найдя папку (если есть)
        // или версию (vXXXX)
        const folderOrVersionIndex = imageUrl.indexOf('/upload/'); // Ищем конец /upload/
        if (folderOrVersionIndex > 0) {
             const pathAfterUpload = imageUrl.substring(folderOrVersionIndex + '/upload/'.length);
             // Удаляем версию, если она есть в начале
             const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
             // Удаляем расширение
              const lastDotInPath = pathWithoutVersion.lastIndexOf('.');
              const finalPublicId = lastDotInPath === -1 ? pathWithoutVersion : pathWithoutVersion.substring(0, lastDotInPath);
              return finalPublicId;
        }

        // Если /upload/ не найдено, возвращаем то, что извлекли ранее
        return publicId;
        
    } catch (error) {
        console.error("Ошибка при извлечении Public ID из URL:", imageUrl, error);
        return null;
    }
};

module.exports = {
    extractPublicId,
}; 