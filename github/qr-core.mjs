import {createRequire} from 'node:module';
const require=createRequire(new URL('../rebuild/package.json',import.meta.url));
const QRCode=require('qrcode'),jsQR=require('jsqr'),{PNG}=require('pngjs');
export async function encodeQR(url){
 const canonical=new URL(url).href;
 if(!canonical.startsWith('https://')||new URL(canonical).username||new URL(canonical).password)throw new Error('QR target must be a public HTTPS URL.');
 const options={errorCorrectionLevel:'H',margin:4,color:{dark:'#000000',light:'#ffffff'}};
 const png=await QRCode.toBuffer(canonical,{...options,width:1200,type:'png'});
 const image=PNG.sync.read(png),decoded=jsQR(new Uint8ClampedArray(image.data),image.width,image.height);
 if(decoded?.data!==canonical)throw new Error('QR roundtrip verification failed.');
 return {url:canonical,png,svg:await QRCode.toString(canonical,{...options,type:'svg'}),decodedCorrectly:true};
}
