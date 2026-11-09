// A single restrained lighting arc, shared by the scene and its practical lamps.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const blend=(a,b,t)=>{const out={};for(const key of Object.keys(a))out[key]=a[key]+(b[key]-a[key])*t;return out;};
const street={ambient:1.20,key:3.20,rim:1.70,environment:.32,exposure:1.08,lamps:1,warmth:.95};
const photo={ambient:1.25,key:3.25,rim:1.55,environment:.32,exposure:1.10,lamps:1.08,warmth:1};
const dark={ambient:.55,key:1.35,rim:.90,environment:.18,exposure:1.02,lamps:.58,warmth:.76};
const contact={ambient:.65,key:1.50,rim:1.00,environment:.20,exposure:1.04,lamps:.64,warmth:.85};
const burst={ambient:1.35,key:3.40,rim:1.85,environment:.34,exposure:1.13,lamps:1.12,warmth:1};
const snow={ambient:1.02,key:2.55,rim:1.30,environment:.27,exposure:1.08,lamps:1,warmth:.82};
export function cinematicState(story={}){
 const s=Number.isFinite(story.local)?Math.max(0,story.local):0;
 switch(story.phase){
  case 'intro':return blend({...street,ambient:.95,key:2.1,environment:.25,exposure:1.04},street,smooth(Math.max((s-5.6)/2.4,Number.isFinite(story.reveal)?story.reveal:0)));
  case 'photo':return blend(street,photo,smooth(s/3));
  case 'fracture':{const dusk=blend(photo,dark,smooth(s/6));return blend(dusk,contact,smooth((s-14)/2));}
  case 'bloom':{const light=blend(contact,burst,smooth(s/1.8));return blend(light,snow,smooth((s-4.6)/3.4));}
  case 'snow':case 'final':return {...snow};
  default:return {...street};
 }
}
