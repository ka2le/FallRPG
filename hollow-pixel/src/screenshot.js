import { toBlob } from 'html-to-image';

// Capture the composited game, including the HUD and any open conversation/menu.
// Everything is local: no screen-sharing permission and no upload.
export async function saveScreenshot(){
  const blob=await toBlob(document.getElementById('app'),{
    width:innerWidth,height:innerHeight,pixelRatio:1,skipFonts:true,
    backgroundColor:'#17271f',
  });
  if(!blob)throw new Error('The screenshot could not be encoded.');
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`between-seasons-${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
  link.click();
  // Allow the browser to finish starting its download before releasing the image.
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
