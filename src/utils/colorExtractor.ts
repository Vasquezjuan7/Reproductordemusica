export const getDominantColor = (imageSrc: string): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!imageSrc) return resolve(null);
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64; 
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if(!ctx) return resolve(null);
            
            ctx.drawImage(img, 0, 0, 64, 64);
            try {
                const data = ctx.getImageData(0, 0, 64, 64).data;
                let r = 0, g = 0, b = 0;
                let count = 0;
                
                // Sample every 4th pixel for speed
                for (let i = 0; i < data.length; i += 16) { 
                    const rValue = data[i];
                    const gValue = data[i+1];
                    const bValue = data[i+2];
                    
                    // Filter out very dark/pitch black or very light/pure white
                    const brightness = (rValue + gValue + bValue) / 3;
                    if (brightness > 30 && brightness < 225) {
                        r += rValue;
                        g += gValue;
                        b += bValue;
                        count++;
                    }
                }
                
                if (count === 0) return resolve(null);
                
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);
                
                resolve(`rgb(${r}, ${g}, ${b})`);
            } catch (e) {
                // Fallback on crossOrigin taint issues
                resolve(null);
            }
        };
        
        img.onerror = () => resolve(null);
    });
};
