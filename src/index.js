/* eslint-disable no-undef */
/* eslint-disable no-await-in-loop */
import merge from 'merge-img';
import Jimp from 'jimp';

const pageDown = async ( page ) => {
    const isEnd = await page.evaluate( () => {
        const screenshotCaptureMax = 16 * 1024;
        const viewportHeight = Math.floor(screenshotCaptureMax / window.devicePixelRatio) - 1;
        window.scrollBy( 0, viewportHeight );
        return window.scrollY >= document.documentElement.scrollHeight - viewportHeight;
    } );

    return isEnd;
};

const fullPageScreenshot = async ( page, options = {}, quality = 100) => {
    const { pagesCount, extraPixels, viewport } = await page.evaluate( () => {
        window.scrollTo( 0, 0 );
        const pageHeight = document.documentElement.scrollHeight;
        const screenshotCaptureMax = 16 * 1024; // https://bugs.chromium.org/p/chromium/issues/detail?id=770769
        const viewportHeight = Math.floor(screenshotCaptureMax / window.devicePixelRatio) - 1;
        return {
            pagesCount: Math.ceil( pageHeight / viewportHeight ),
            extraPixels: pageHeight % viewportHeight * window.devicePixelRatio,
            viewport: { height: viewportHeight * window.devicePixelRatio, width: window.innerWidth * window.devicePixelRatio },
        };
    } );

    const images = [];
    for ( let index = 0; index < pagesCount; index += 1 ) {
        if ( options.delay ) {
            await page.waitFor( options.delay );
        }
        const image = await page.screenshot( { fullPage: false , quality: quality } );
        await pageDown( page );
        images.push( image );
    }

    if ( pagesCount === 1 ) {
        const image = await Jimp.read( images[0] );
        if ( options.path ) image.write( options.path );
        return image;
    }
    // crop last image extra pixels
    const cropped = await Jimp.read( images.pop() )
        .then( image => image.crop( 0, viewport.height - extraPixels, viewport.width, extraPixels ) )
        .then( image => image.getBufferAsync( Jimp.AUTO ) );

    images.push( cropped );
    const mergedImage = await merge( images, { direction: true } );
 
    if (options.path) {
        await new Promise((resolve, reject) => {
          mergedImage.write(options.path, () => {
            resolve();
          });
        });
    };
    
    return mergedImage;
};

export default fullPageScreenshot;
