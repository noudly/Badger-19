/** A small, tangible street. Everything is geometry, light and material. */
export function createWorld(THREE, scene) {
  const group = new THREE.Group();
  group.name = 'badger-courtyard';
  scene.add(group);
  const targets = [];
  const clamp = THREE.MathUtils.clamp;
  const lerp = THREE.MathUtils.lerp;
  const smooth = (a,b,x) => {const n=clamp((x-a)/(b-a),0,1); return n*n*(3-2*n);};
  let seed=19;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const resources=[];
  const material=(color,roughness=.65,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness:0,...extra});resources.push(m);return m;};
  const stone=material('#213b3c',.24,{metalness:.2});
  const mortar=material('#132a2e',.65);
  const plaster=material('#344e50',.86);
  const plasterSide=material('#283e43',.82);
  const brick=material('#5b5550',.92);
  const wood=material('#253735',.62);
  const paleWood=material('#7d7666',.65);
  const brass=material('#ad9157',.3,{metalness:.72});
  const iron=material('#14282d',.4,{metalness:.63});
  const roofmat=material('#21333d',.65,{metalness:.18});
  const cream=material('#dad1b4',.74);
  const terracotta=material('#815a43',.86);
  const leafmat=material('#47644f',.78);
  const warmGlass=material('#f9c26b',.32,{emissive:'#eaa950',emissiveIntensity:.66});
  const softGlass=material('#b9cebd',.3,{emissive:'#b4bb86',emissiveIntensity:.18});
  const glass=material('#1b343a',.15,{metalness:.2,transparent:true,opacity:.78});
  const flowerCream=material('#fff3c9',.65,{emissive:'#fff0b0',emissiveIntensity:.07});
  const flowerGold=material('#d7a43f',.63);
  const snowMaterial=material('#b8ced0',.96,{transparent:true,opacity:0});
  const snowCaps=[];
  const boxGeo=new THREE.BoxGeometry(1,1,1);
  const sphereGeo=new THREE.SphereGeometry(1,16,12);
  const cylinderGeo=new THREE.CylinderGeometry(1,1,1,14);
  resources.push(boxGeo,sphereGeo,cylinderGeo);
  const mesh=(geometry,mat,parent=group)=>{const m=new THREE.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(x,y,z,sx,sy,sz,mat,parent=group)=>{const m=mesh(boxGeo,mat,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;};
  const ball=(x,y,z,sx,sy,sz,mat,parent=group)=>{const m=mesh(sphereGeo,mat,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;};
  const cylinder=(x,y,z,r,h,mat,parent=group)=>{const m=mesh(cylinderGeo,mat,parent);m.position.set(x,y,z);m.scale.set(r,h,r);return m;};
  const snowCap=(x,y,z,sx,sy,sz,parent=group)=>{const m=box(x,y,z,sx,sy,sz,snowMaterial,parent);snowCaps.push(m);return m;};
  function barBetween(a,b,r,mat,parent=group){const d=new THREE.Vector3().subVectors(b,a);const m=cylinder(0,0,0,r,d.length(),mat,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
  function texture(width,height,draw){const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');draw(ctx,width,height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;resources.push(t);return t;}
  const wallTexture=texture(256,256,(ctx,w,h)=>{ctx.fillStyle='#83908b';ctx.fillRect(0,0,w,h);for(let i=0;i<2400;i++){const v=Math.floor(100+random()*100);ctx.fillStyle=`rgba(${v},${v},${v},.12)`;ctx.fillRect(random()*w,random()*h,random()*3+.3,random()*3+.3);}});
  wallTexture.wrapS=wallTexture.wrapT=THREE.RepeatWrapping;wallTexture.repeat.set(3,3);plaster.map=wallTexture;plasterSide.map=wallTexture;
  // Individual wet cobbles catch the lights; spacing gives the paving real depth.
  box(0,-.21,-1,20,.3,19,mortar);
  const cobbles=new THREE.InstancedMesh(boxGeo,stone,20*21);
  cobbles.receiveShadow=true;group.add(cobbles);
  const dummy=new THREE.Object3D();let ci=0;
  for(let row=0;row<21;row++)for(let col=0;col<20;col++){
    dummy.position.set((col-9.5)*.73+(row%2)*.35,-.028+random()*.016,(row-10)*.69-1.2);
    dummy.scale.set(.665+random()*.028,.12,.61+random()*.035);dummy.rotation.set(0,(random()-.5)*.018,0);dummy.updateMatrix();cobbles.setMatrixAt(ci,dummy.matrix);
    cobbles.setColorAt(ci,new THREE.Color().setHSL(.46+random()*.04,.1+random()*.12,.16+random()*.08));ci++;
  }
  // Small pooled reflections, softer than a mirror.
  const puddleMat=material('#345354',.065,{metalness:.5,transparent:true,opacity:.55});
  for(let i=0;i<12;i++){
    const p=ball((random()-.5)*9,.041,(random()-.5)*9-1.5,.3+random()*.8,.006,.1+random()*.35,puddleMat);p.rotation.y=random()*Math.PI;
  }
  // Curbs frame the empty stage without enclosing it.
  box(-6.1,.12,-1,.38,.32,14,brick);box(6.1,.12,-1,.38,.32,14,brick);
  box(-5.2,.01,-4.6,2,.1,5,plasterSide);box(5.2,.01,-4.6,2,.1,5,plasterSide);

  function windowFrame(parent,x,y,z,w,h,lit=true){
    const pane=box(x,y,z,w,h,.05,lit?warmGlass:softGlass,parent);pane.castShadow=false;
    box(x-w/2-.045,y,z+.045,.085,h+.15,.1,wood,parent);box(x+w/2+.045,y,z+.045,.085,h+.15,.1,wood,parent);
    box(x,y-h/2-.05,z+.045,w+.18,.1,.14,paleWood,parent);box(x,y+h/2+.05,z+.045,w+.18,.1,.1,wood,parent);
    box(x,y,z+.07,.05,h,.08,wood,parent);box(x,y,z+.07,w,.05,.08,wood,parent);
    snowCap(x,y+h/2+.11,z+.055,w+.2,.045,.15,parent);
    return pane;
  }
  function roof(parent,x,y,z,w,d){
    const half=w*.55;
    for(const side of [-1,1]){const r=box(x+side*w*.25,y,z,half,.12,d,roofmat,parent);r.rotation.z=side*-.28;snowCap(x+side*w*.25,y+.09,z,half,.04,d,parent).rotation.z=side*-.28;}
    cylinder(x,y+.24,z,.055,d,iron,parent).rotation.x=Math.PI/2;
  }
  const shop=new THREE.Group();group.add(shop);shop.position.set(-3.7,0,-5.1);
  box(0,2.25,0,4.8,4.5,2.3,plaster,shop);
  // Side brickwork and irregular plaster edges.
  for(let i=0;i<8;i++)box(-2.38,.2+i*.22,1.18,.18,.17,.08,brick,shop);
  box(0,.27,1.2,4.9,.5,.2,wood,shop);box(0,2.7,1.2,4.94,.19,.24,paleWood,shop);
  box(0,3.8,1.2,4.9,.13,.2,paleWood,shop);
  windowFrame(shop,-.62,1.48,1.19,2.6,1.85,true);
  box(-.62,.57,1.43,2.92,.13,.46,paleWood,shop);
  // Deep interior shelf and vinyl sleeves behind the glass.
  box(-.62,1.0,1.10,2.6,.11,.3,wood,shop);
  for(let i=0;i<7;i++){
    const sleeve=material(['#b7aa82','#6c8c84','#b98c6e','#9ca796'][i%4],.8);
    const s=box(-1.65+i*.33,1.39,1.155,.25,.48,.02,sleeve,shop);s.rotation.z=(i%3-1)*.06;
    const disc=cylinder(0,0,0,.075,.015,iron,shop);disc.rotation.x=Math.PI/2;disc.position.set(s.position.x,s.position.y,1.18);
  }
  // A real spinning vinyl display, not an image stuck on a wall.
  const vinyl=new THREE.Group();shop.add(vinyl);vinyl.position.set(-.55,1.98,1.265);
  const record=cylinder(0,0,0,.39,.035,iron,vinyl);record.rotation.x=Math.PI/2;
  const center=cylinder(0,0,0,.105,.042,material('#ba8358',.6),vinyl);center.rotation.x=Math.PI/2;
  for(let r=.17;r<.37;r+=.045){const ring=mesh(new THREE.TorusGeometry(r,.004,3,36),brass,vinyl);ring.rotation.x=0;ring.position.z=.024;ring.castShadow=false;}
  targets.push({object:vinyl,kind:'record'});
  // Door with transom and metal handle.
  box(1.63,1.32,1.21,.93,2.62,.14,wood,shop);windowFrame(shop,1.63,1.77,1.3,.59,1.28,false);
  box(1.63,.53,1.3,.65,.5,.05,plasterSide,shop);cylinder(1.89,1.16,1.43,.025,.28,brass,shop);
  box(1.63,.09,1.55,1.25,.18,.8,brick,shop);
  const signTex=texture(512,128,(ctx,w,h)=>{ctx.fillStyle='#233836';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#ac9f7a';ctx.lineWidth=2;ctx.strokeRect(7,7,w-14,h-14);ctx.fillStyle='#d3c9a5';ctx.textAlign='center';ctx.font='500 56px Georgia';ctx.fillText('SIDE B',w/2,76);});
  const signmat=material('#fff',.65,{map:signTex});box(-.45,2.99,1.27,3.25,.57,.12,signmat,shop);
  for(const x of [-1.8,1.35])barBetween(new THREE.Vector3(x,3.4,1.17),new THREE.Vector3(x,3.15,1.5),.022,iron,shop);
  windowFrame(shop,-1.25,3.36,1.195,.54,.6,false);windowFrame(shop,.6,3.36,1.195,.54,.6,false);
  roof(shop,0,4.68,0,5.2,2.9);
  // Corrugated canopy, striped only through geometry and light.
  const awning=box(-.62,2.59,1.85,3.1,.08,1.1,wood,shop);awning.rotation.x=.08;
  for(let i=0;i<12;i++)box(-2.0+i*.25,2.53,2.38,.09,.18,.06,paleWood,shop);

  const house=new THREE.Group();house.position.set(4.1,0,-6.5);group.add(house);
  box(0,3.1,0,4.7,6.2,3.2,plasterSide,house);box(0,.2,1.65,4.85,.4,.18,brick,house);
  for(const y of [1.35,3.25,5.05])for(const x of [-1.22,1.12])windowFrame(house,x,y,1.63,.92,1.18,(y===3.25&&x<0)||y===1.35);
  for(const y of [2.25,4.12])box(0,y,1.66,4.82,.12,.19,paleWood,house);
  roof(house,0,6.36,0,5.1,3.8);
  const drain=cylinder(-2.17,2.9,1.72,.065,5.8,iron,house);
  box(-2.15,.16,1.85,.2,.15,.4,iron,house);
  // Alley beyond: distant shapes and a warm pin of light suggest more of the world.
  box(.5,2.6,-9,3,5.2,2,plasterSide);windowFrame(group,.8,2.0,-7.98,.55,1.0,true);
  box(-1.2,1.85,-8.1,.45,3.7,.2,brick);box(2.1,2.7,-8.1,.5,5.4,.2,brick);
  for(let i=0;i<6;i++)box(.5,.04+i*.12,-6.3-i*.31,2.9,.14,.48,brick);

  // Photography alcove: one ordinary window, a vase, light, a leaf.
  const alcove=new THREE.Group();alcove.position.set(3.2,0,-2.75);group.add(alcove);
  box(0,1.65,-.12,2.15,3.3,.3,plaster,alcove);
  windowFrame(alcove,0,1.85,.08,1.5,1.8,true);
  box(0,.88,.36,2.15,.14,.84,paleWood,alcove);snowCap(0,.98,.36,2.2,.035,.87,alcove);
  const curtain=material('#dfc89c',.9,{transparent:true,opacity:.6});
  for(let i=0;i<3;i++)box(-.62+i*.11,1.82,.16,.08,1.55,.06,curtain,alcove);
  for(let i=0;i<3;i++)box(.4+i*.11,1.82,.16,.08,1.55,.06,curtain,alcove);
  const vase=new THREE.Group();vase.position.set(-.22,1.0,.46);alcove.add(vase);
  ball(0,.19,0,.21,.23,.18,cream,vase);cylinder(0,.36,0,.095,.17,cream,vase);
  const rim=mesh(new THREE.TorusGeometry(.095,.019,6,18),cream,vase);rim.rotation.x=Math.PI/2;rim.position.y=.455;
  const flowers=[];
  function daisy(parent,x,y,z,scale=1){
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    const head=new THREE.Group();head.position.y=.54;head.rotation.x=.22;head.rotation.z=(random()-.5)*.5;g.add(head);
    barBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(0,.54,0),.011,leafmat,g);
    ball(.055,.2,0,.08,.025,.025,leafmat,g).rotation.z=.6;
    for(let j=0;j<8;j++){const a=j*Math.PI/4;const p=ball(Math.cos(a)*.095,Math.sin(a)*.095,0,.065,.032,.018,flowerCream,head);p.rotation.z=a;}
    ball(0,0,.018,.047,.047,.024,flowerGold,head);flowers.push(g);return g;
  }
  daisy(vase,-.03,.38,0,1.1);daisy(vase,.12,.37,.015,.85).rotation.z=-.32;daisy(vase,-.12,.36,-.01,.8).rotation.z=.28;
  targets.push({object:vase,kind:'flower'});
  // Folded camera strap and a small old camera beside the vase.
  const cameraProp=new THREE.Group();cameraProp.position.set(.58,1.01,.5);cameraProp.rotation.y=-.23;alcove.add(cameraProp);
  box(0,.11,0,.43,.23,.2,iron,cameraProp);box(0,.21,0,.2,.08,.18,brass,cameraProp);
  cylinder(0,.12,.14,.09,.16,iron,cameraProp).rotation.x=Math.PI/2;
  cylinder(0,.12,.232,.061,.015,glass,cameraProp).rotation.x=Math.PI/2;
  // Potted flowers and quiet debris occupy the sides, not the character stage.
  function pot(x,z,size=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(size);group.add(g);const body=mesh(new THREE.CylinderGeometry(.24,.17,.43,16),terracotta,g);body.position.y=.215;const rim=mesh(new THREE.TorusGeometry(.235,.025,6,18),terracotta,g);rim.rotation.x=Math.PI/2;rim.position.y=.43;for(let i=0;i<5;i++){const a=i*1.3;const stem=barBetween(new THREE.Vector3(0,.4,0),new THREE.Vector3(Math.sin(a)*.2,.8+random()*.35,Math.cos(a)*.14),.012,leafmat,g);for(let j=0;j<2;j++)ball(Math.sin(a)*.14,.65+j*.15,Math.cos(a)*.1,.16,.025,.045,leafmat,g).rotation.z=a;}snowCap(0,.446,0,.3,.025,.3,g);return g;}
  pot(-4.3,-1.0,1.3);pot(4.65,-.6,.9);pot(2.2,-2.5,.7);
  // Iron bench; small, weathered, reassuringly ordinary.
  const bench=new THREE.Group();bench.position.set(-4.1,0,-1.55);bench.rotation.y=.25;group.add(bench);
  for(let i=0;i<4;i++)box(0,.6,-.24+i*.16,1.9,.07,.12,paleWood,bench);
  for(let i=0;i<3;i++)box(0,.89+i*.15,-.32,1.9,.095,.06,wood,bench);
  for(const x of [-.72,.72]){barBetween(new THREE.Vector3(x,0,-.22),new THREE.Vector3(x,.65,-.22),.036,iron,bench);barBetween(new THREE.Vector3(x,0,.23),new THREE.Vector3(x,.6,.23),.036,iron,bench);}
  snowCap(0,.68,-.02,1.9,.035,.6,bench);
  // One lamp casts the story's warm pool. Its light is an actual light in the scene.
  const lamp=new THREE.Group();lamp.position.set(-2.5,0,-.9);group.add(lamp);
  cylinder(0,.13,0,.18,.26,iron,lamp);cylinder(0,1.65,0,.055,3.0,iron,lamp);
  const arc=new THREE.CatmullRomCurve3([new THREE.Vector3(0,3.12,0),new THREE.Vector3(.05,3.36,0),new THREE.Vector3(.35,3.43,0),new THREE.Vector3(.61,3.25,0)]);
  mesh(new THREE.TubeGeometry(arc,18,.04,7,false),iron,lamp);
  const shade=mesh(new THREE.ConeGeometry(.3,.23,20,1,true),iron,lamp);shade.position.set(.61,3.13,0);shade.rotation.x=Math.PI;
  ball(.61,3.12,0,.09,.115,.09,warmGlass,lamp);
  const lampLight=new THREE.PointLight('#ffc176',32,7.4,2);lampLight.position.set(.61,3.05,.08);lamp.add(lampLight);
  const lampPool=new THREE.SpotLight('#ffcb8a',16,7.8,.65,.7,1.3);lampPool.position.set(.61,3.05,0);lampPool.target.position.set(.3,.1,.9);lamp.add(lampPool,lampPool.target);
  targets.push({object:lamp,kind:'lamp'});
  const windowLight=new THREE.PointLight('#ffc078',18,5,2);windowLight.position.set(3.05,1.8,-2.05);group.add(windowLight);
  const shopLight=new THREE.PointLight('#ffc376',16,5.5,2);shopLight.position.set(-4.1,1.65,-3.1);group.add(shopLight);
  // A sagging string of individually modeled bulbs connects the two buildings.
  const stringPts=[];
  for(let i=0;i<=20;i++){const f=i/20;stringPts.push(new THREE.Vector3(lerp(-5.3,4.8,f),3.9-Math.sin(f*Math.PI)*.9,-3.9));}
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stringPts),32,.012,4,false),iron);
  for(let i=0;i<11;i++){const f=(i+.3)/11;const x=lerp(-5.3,4.8,f),y=3.9-Math.sin(f*Math.PI)*.9;barBetween(new THREE.Vector3(x,y,-3.9),new THREE.Vector3(x,y-.14,-3.9),.01,iron);ball(x,y-.19,-3.9,.045,.065,.045,warmGlass);}

  const leafGeo=new THREE.SphereGeometry(1,8,5);
  resources.push(leafGeo);
  const autumnMats=['#b99b61','#8f734c','#bf8b55'].map(c=>material(c,.76));
  const fallen=[];
  for(let i=0;i<38;i++){const a=random()*Math.PI*2,r=2+random()*4.2;const m=mesh(leafGeo,autumnMats[i%3]);m.position.set(Math.cos(a)*r,.065,Math.sin(a)*r-1);m.scale.set(.035+random()*.04,.008,.085+random()*.04);m.rotation.y=random()*6.28;m.rotation.z=(random()-.5)*.2;m.userData.base=m.position.clone();fallen.push(m);}
  // Quiet dust, then snow, use one draw call each.
  function points(count,color,size){const a=new Float32Array(count*3);for(let i=0;i<count;i++){a[i*3]=(random()-.5)*14;a[i*3+1]=random()*7;a[i*3+2]=(random()-.5)*13-1;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(a,3));const mat=new THREE.PointsMaterial({color,size,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true});const p=new THREE.Points(geo,mat);group.add(p);resources.push(geo,mat);return p;}
  const dust=points(110,'#ffe8b0',.018),snow=points(380,'#e5eff0',.032);
  dust.material.opacity=.3;
  const snowBase=new Float32Array(snow.geometry.attributes.position.array);
  const dustBase=new Float32Array(dust.geometry.attributes.position.array);

  // Digital glass initially occludes the street. Every pane is an object in space.
  const codeTexture=texture(1024,512,(ctx,w,h)=>{ctx.fillStyle='#0a1c22';ctx.fillRect(0,0,w,h);ctx.font='17px monospace';for(let i=0;i<26;i++){const y=20+i*19;ctx.fillStyle=i%5===0?'#80b8ac':'#315e5c';ctx.fillText(['const world = waiting;','memory.keep(small_things);','if (light) return home;','await a_little_courage();','0100 0011 0001 1001'][i%5],22,y);ctx.fillStyle='#204448';ctx.fillRect(710,y-13,210,1);}ctx.strokeStyle='#5e9b91';ctx.lineWidth=2;ctx.strokeRect(3,3,w-6,h-6);});
  const codeMat=new THREE.MeshBasicMaterial({map:codeTexture,transparent:true,opacity:.92,side:THREE.DoubleSide,depthWrite:false,color:'#b8d7ce'});resources.push(codeMat);
  const panes=new THREE.Group();group.add(panes);
  const paneGeo=new THREE.PlaneGeometry(3.15,1.55);resources.push(paneGeo);
  const paneObjects=[];
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const p=mesh(paneGeo,codeMat,panes);p.position.set((col-1.5)*3.22,.55+row*1.61,1.75+random()*.12);p.rotation.y=(col-1.5)*-.045;p.castShadow=false;p.receiveShadow=false;p.userData.base=p.position.clone();p.name='code-panel-'+paneObjects.length;paneObjects.push(p);
  }
  // The code surface genuinely splits: triangles preserve each panel's UVs,
  // so the first moving frame is still the very same glass, not replacement confetti.
  const struckPanel=paneObjects[1];
  struckPanel.position.z=1.850718;struckPanel.rotation.set(0,.0225,0);struckPanel.userData.base.copy(struckPanel.position);struckPanel.userData.struck=true;
  const codeImpact=new THREE.Vector3(-.37,1.04,1.823);
  const impactNormal=new THREE.Vector3(Math.sin(.0225),0,Math.cos(.0225));
  const impactSurface=codeImpact.clone();impactSurface.z=struckPanel.userData.base.z-Math.tan(.0225)*(codeImpact.x-struckPanel.userData.base.x);
  // A small impact at the fist precedes the larger fracture wave. The line
  // segments are sorted radially, so the crack grows out of the same point.
  const crackSegments=[];
  for(let branch=0;branch<9;branch++){
    const angle=branch*Math.PI*2/9+(random()-.5)*.18;
    let previous=new THREE.Vector3(0,0,0);
    for(let step=1;step<=5;step++){
      const radius=step*(.21+branch%3*.035);
      const a=angle+(random()-.5)*.24;
      const next=new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,0);
      crackSegments.push({a:previous.clone(),b:next.clone(),distance:(previous.length()+next.length())*.5});
      if(step===3||step===4){const fork=next.clone().add(new THREE.Vector3(Math.cos(a+.55)*.24,Math.sin(a+.55)*.24,0));crackSegments.push({a:next.clone(),b:fork,distance:next.length()+.12});}
      previous=next;
    }
  }
  crackSegments.sort((a,b)=>a.distance-b.distance);
  const impactGeometry=new THREE.BufferGeometry();impactGeometry.setAttribute('position',new THREE.Float32BufferAttribute(crackSegments.flatMap(s=>[...s.a.toArray(),...s.b.toArray()]),3));impactGeometry.setDrawRange(0,0);
  const impactMaterial=new THREE.LineBasicMaterial({color:'#ddf5df',transparent:true,opacity:0,depthWrite:false,toneMapped:false});resources.push(impactGeometry,impactMaterial);
  const impactCracks=new THREE.LineSegments(impactGeometry,impactMaterial);impactCracks.name='opening-impact-cracks';impactCracks.position.copy(impactSurface).addScaledVector(impactNormal,.004);impactCracks.rotation.y=.0225;impactCracks.renderOrder=4;impactCracks.visible=false;group.add(impactCracks);
  const impactLight=new THREE.PointLight('#d7f3d4',0,2.8,2);impactLight.position.copy(impactSurface).addScaledVector(impactNormal,-.20);group.add(impactLight);
  const introFragments=[];
  paneObjects.forEach((pane,index)=>{
    const corners=[[-1.575,-.775],[1.575,-.775],[1.575,.775],[-1.575,.775]];
    for(let j=0;j<4;j++){
      const pts=[[0,0],corners[j],corners[(j+1)%4]];
      const cx=pts.reduce((v,p)=>v+p[0],0)/3,cy=pts.reduce((v,p)=>v+p[1],0)/3;
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(pts.flatMap(p=>[p[0]-cx,p[1]-cy,0]),3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(pts.flatMap(p=>[p[0]/3.15+.5,p[1]/1.55+.5]),2));
      geometry.computeVertexNormals();resources.push(geometry);
      const shard=mesh(geometry,codeMat,panes);shard.castShadow=false;shard.receiveShadow=false;shard.visible=false;
      const origin=new THREE.Vector3(cx,cy,0).applyEuler(pane.rotation).add(pane.userData.base);
      const offset=origin.clone().sub(codeImpact),distance=Math.hypot(offset.x,offset.y);
      const direction=new THREE.Vector3(offset.x,offset.y,.12).normalize();
      shard.userData={origin,direction,distance,delay:Math.min(.36,distance*.047),twist:(random()-.5)*6,speed:.6+random()*.5,index,baseRotation:pane.rotation.clone()};
      introFragments.push(shard);
    }
  });
  // Each intact panel lasts until the fracture wave reaches its nearest triangle.
  // Arrival delays are measured from the exact contact point, not from screen center.
  const nearestImpactShard=Math.min(...introFragments.map(s=>s.userData.distance));
  introFragments.forEach(shard=>{shard.userData.arrivalDelay=.06+Math.min(.38,Math.max(0,shard.userData.distance-nearestImpactShard)*.05);});
  paneObjects.forEach((pane,index)=>{pane.userData.breakDelay=Math.min(...introFragments.filter(s=>s.userData.index===index).map(s=>s.userData.arrivalDelay));});
  // The new fracture is at ground level. Light leaks between real raised edges,
  // leaving the characters' faces and silhouettes entirely clear.
  const rift=new THREE.Group();group.add(rift);rift.position.y=.068;
  const riftGold=new THREE.MeshBasicMaterial({color:'#edbd7a',transparent:true,opacity:0,depthWrite:false});
  const riftWhite=new THREE.MeshBasicMaterial({color:'#fff0c8',transparent:true,opacity:0,depthWrite:false});
  resources.push(riftGold,riftWhite);
  const crackPoints=[new THREE.Vector3(-.04,0,3.0),new THREE.Vector3(.04,0,2),new THREE.Vector3(-.09,0,.95),new THREE.Vector3(.06,0,.1),new THREE.Vector3(-.1,0,-.8),new THREE.Vector3(.08,0,-1.8),new THREE.Vector3(-.02,0,-3.2)];
  for(let i=1;i<crackPoints.length;i++){
    barBetween(crackPoints[i-1],crackPoints[i],.035,riftGold,rift);
    barBetween(crackPoints[i-1].clone().add(new THREE.Vector3(0,.006,0)),crackPoints[i].clone().add(new THREE.Vector3(0,.006,0)),.012,riftWhite,rift);
  }
  for(let i=1;i<6;i++){
    const start=crackPoints[i],end=start.clone().add(new THREE.Vector3((i%2?1:-1)*(.35+i*.08),-.002,-.22));
    barBetween(start,end,.018,riftGold,rift);
  }
  const riftEdges=[];
  for(let i=0;i<12;i++)for(const side of [-1,1]){
    const z=2.65-i*.47,edge=box(side*.12,.044,z,.12,.085,.38,stone,rift);
    edge.rotation.z=side*-.18;edge.rotation.y=(random()-.5)*.2;edge.userData={x:side*.12,side};riftEdges.push(edge);
  }
  const reunionLight=new THREE.PointLight('#ffdb9d',0,7,2);reunionLight.position.set(0,.32,.2);group.add(reunionLight);
  const haloMaterial=new THREE.MeshBasicMaterial({color:'#f6d9a1',transparent:true,opacity:0,depthWrite:false});resources.push(haloMaterial);
  const halo=mesh(new THREE.TorusGeometry(1,.018,4,64),haloMaterial);halo.rotation.x=-Math.PI/2;halo.position.set(0,.075,.3);halo.castShadow=false;
  // One small piece of the bright world survives. It is held between the two
  // inner paws instead of becoming another full-screen effect.
  const savedLight=new THREE.Group();savedLight.name='saved-light';savedLight.position.set(0,.96,.20);group.add(savedLight);savedLight.visible=false;
  const seedMaterial=material('#f5d39a',.3,{emissive:'#ffd485',emissiveIntensity:1.65,transparent:true,opacity:0});
  const seedGeometry=new THREE.IcosahedronGeometry(.057,0);resources.push(seedGeometry);
  const lightSeed=mesh(seedGeometry,seedMaterial,savedLight);lightSeed.position.set(0,.025,.13);lightSeed.castShadow=false;lightSeed.receiveShadow=false;
  const seedLight=new THREE.PointLight('#ffcf8b',0,1.9,2);seedLight.position.set(0,.025,.13);savedLight.add(seedLight);
  const seedHitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  const seedHitGeometry=new THREE.SphereGeometry(.17,10,8);resources.push(seedHitMaterial,seedHitGeometry);
  const seedHit=new THREE.Mesh(seedHitGeometry,seedHitMaterial);seedHit.name='saved-light-touch-area';savedLight.add(seedHit);
  seedHit.raycast=function(raycaster,hits){if(savedLight.visible)THREE.Mesh.prototype.raycast.call(this,raycaster,hits);};
  targets.push({object:savedLight,kind:'light'});
  // A single small crystal can be noticed amongst the ordinary snowfall. Its
  // fine, faceted branches share one mesh so it stays delicate on small screens.
  const palmSnow=new THREE.Group();palmSnow.name='snow-palm-flake';palmSnow.visible=false;group.add(palmSnow);
  const snowCrystalVertices=[];
  function crystalBranch(ax,ay,bx,by,width){
    const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy),nx=-dy/length*width,ny=dx/length*width;
    const mx=(ax+bx)*.5,my=(ay+by)*.5;
    const outline=[[ax,ay],[mx+nx,my+ny],[bx,by],[mx-nx,my-ny]];
    // Each arm is a shallow diamond, catching light like a small ice facet.
    for(let i=0;i<4;i++){
      const a=outline[i],b=outline[(i+1)%4];
      snowCrystalVertices.push(mx,my,.0035,b[0],b[1],0,a[0],a[1],0);
      snowCrystalVertices.push(mx,my,-.0035,a[0],a[1],0,b[0],b[1],0);
    }
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,dx=Math.cos(a),dy=Math.sin(a);
    crystalBranch(0,0,dx*.065,dy*.065,.005);
    for(const side of [-1,1]){
      const branch=a+side*Math.PI/3;
      crystalBranch(dx*.034,dy*.034,dx*.034+Math.cos(branch)*.021,dy*.034+Math.sin(branch)*.021,.0032);
    }
  }
  const snowCrystalGeometry=new THREE.BufferGeometry();snowCrystalGeometry.setAttribute('position',new THREE.Float32BufferAttribute(snowCrystalVertices,3));snowCrystalGeometry.computeVertexNormals();resources.push(snowCrystalGeometry);
  const snowCrystalMaterial=material('#f1f7f4',.58,{emissive:'#d8eeee',emissiveIntensity:.22,transparent:true,opacity:0,depthWrite:false});
  const snowCrystal=mesh(snowCrystalGeometry,snowCrystalMaterial,palmSnow);snowCrystal.castShadow=false;snowCrystal.receiveShadow=false;
  const snowLanding=new THREE.Vector3();
  let openingBreak=0,openingImpactAt=Infinity,openingDuration=2.85;
  const shardMat=material('#537e7c',.18,{metalness:.5,transparent:true,opacity:0,depthWrite:false,forceSinglePass:true,side:THREE.DoubleSide,emissive:'#355b5d',emissiveIntensity:.25});
  const shards=[];
  for(let i=0;i<44;i++){
    const geometry=new THREE.BufferGeometry();const sc=.18+random()*.52;geometry.setAttribute('position',new THREE.Float32BufferAttribute([-sc,-sc*.45,0,sc*.65,-sc*.4,0,sc*.12,sc,0],3));geometry.computeVertexNormals();resources.push(geometry);
    const m=mesh(geometry,shardMat);m.userData={a:random()*Math.PI*2,r:1.5+random()*2.7,z:(random()-.5)*3.7,rot:random()*6.28};shards.push(m);
  }
  const celebration=[];
  const petalMats=[material('#e7ce9a',.62,{emissive:'#bc8945',emissiveIntensity:.16}),material('#f1e4c6',.7),material('#b5cbc0',.65)];
  for(let i=0;i<42;i++){const p=mesh(leafGeo,petalMats[i%3]);p.scale.set(.07,.024,.13);p.userData={a:random()*Math.PI*2,r:.3+random()*3.8,y:random()*2.7,delay:random()*.9,spin:random()*6.28};p.visible=false;celebration.push(p);}
  let phase='',phaseAt=0;let lightBoost=0;
  const reducedPreference=typeof matchMedia==='function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function update(t,story={},interaction={}){
    const reduced=reducedPreference||!!interaction.reduced;
    const current=story.phase||'intro';
    if(current!==phase){phase=current;phaseAt=t;if(current==='intro'){openingBreak=0;openingImpactAt=Infinity;openingDuration=2.85;}}
    const local=Number.isFinite(story.local)?story.local:t-phaseAt;
    const snowScene=phase==='snow'||phase==='final';
    const snowAmount=phase==='final'?1:snowScene?smooth(0,5,local):0;
    // An explicit phase value also clears the old snow immediately on replay.
    snowMaterial.opacity=snowAmount*.86;
    snow.material.opacity=snowScene?.78:0;
    snow.visible=snowScene&&!reduced;
    const snowSpot=interaction.snowSpot;
    const validSnowSpot=!!snowSpot&&Number.isFinite(snowSpot.x)&&Number.isFinite(snowSpot.y)&&Number.isFinite(snowSpot.z);
    palmSnow.visible=phase==='snow'&&validSnowSpot&&(reduced?local>=5&&local<7.5:local>=3&&local<9);
    snowCrystalMaterial.opacity=0;
    if(palmSnow.visible){
      snowLanding.set(snowSpot.x,snowSpot.y,snowSpot.z);group.updateWorldMatrix(true,false);group.worldToLocal(snowLanding);
      const fall=reduced?0:1-smooth(3,5,local),drift=reduced?0:smooth(7.5,9,local);
      palmSnow.position.copy(snowLanding);
      palmSnow.position.x+=fall*(-.10+Math.sin((local-3)*2)*.018)+drift*.09;
      palmSnow.position.y+=fall*.72+drift*.16;
      palmSnow.position.z+=fall*.025+drift*.04;
      palmSnow.rotation.set(-.35+fall*.4,.15+fall*.9+drift*.3,.24+fall*.6+drift*.5);
      palmSnow.scale.setScalar(1-drift*.62);
      snowCrystalMaterial.opacity=reduced?1:smooth(3,3.2,local)*(1-drift);
    }
    const sa=snow.geometry.attributes.position.array;
    if(snowScene&&!reduced){for(let i=0;i<sa.length/3;i++){sa[i*3]=snowBase[i*3]+Math.sin(t*.24+i)*.35;sa[i*3+1]=((snowBase[i*3+1]-t*(.12+(i%7)*.018))%7+7)%7;sa[i*3+2]=snowBase[i*3+2];}snow.geometry.attributes.position.needsUpdate=true;}
    dust.visible=!snowScene;const da=dust.geometry.attributes.position.array;
    if(!reduced){for(let i=0;i<da.length/3;i++){da[i*3]=dustBase[i*3]+Math.sin(t*.12+i)*.12;da[i*3+1]=dustBase[i*3+1]+Math.sin(t*.2+i*2)*.08;}dust.geometry.attributes.position.needsUpdate=true;}
    const pulse=interaction.pulse;
    const pulseAge=pulse?t-pulse.at:99;
    const pulseV=pulseAge>=0&&pulseAge<2?Math.sin(pulseAge*Math.PI/2)*Math.exp(-pulseAge*1.4):0;
    lightBoost=pulse?.kind==='lamp'?pulseV*12:0;
    const lightLevel=Number.isFinite(interaction.lightLevel)?clamp(interaction.lightLevel,.35,1.25):1;
    lampLight.intensity=(lerp(32,25,snowAmount)+lightBoost)*lightLevel;lampPool.intensity=(lerp(16,12,snowAmount)+lightBoost*.6)*lightLevel;
    const windowBoost=phase==='photo'?smooth(0,3,local):phase==='fracture'?1-smooth(0,3,local):0;
    windowLight.intensity=lerp(18,23,windowBoost)*lightLevel;
    shopLight.intensity=16*lightLevel;
    warmGlass.emissiveIntensity=.66+lightBoost*.02;
    vinyl.rotation.z=reduced?0:t*(pulse?.kind==='record'&&pulseAge<3?1.4:.12);
    flowers.forEach((f,i)=>{f.rotation.z=Math.sin(t*.6+i)*.028+(pulse?.kind==='flower'?pulseV*.13:0);});
    if(reduced)flowers.forEach(f=>f.rotation.z=0);
    fallen.forEach((l,i)=>{if(!reduced&&pulse&&pulseAge<2.8&&pulseAge>=0){l.position.y=l.userData.base.y+Math.sin(clamp(pulseAge/2.8,0,1)*Math.PI)*(.1+(i%5)*.04);l.rotation.z=Math.sin(pulseAge*3+i)*.3;}else l.position.y=l.userData.base.y;});
    const intro=phase==='intro';
    if(intro){
      const autoImpactAt=t-(local-5.075);
      if(local>=5.075&&autoImpactAt<openingImpactAt){openingImpactAt=autoImpactAt;openingDuration=2.85;}
      const tapImpactAt=pulse?.kind==='break'?pulse.at+.375:Infinity;
      if(t>=tapImpactAt&&tapImpactAt<openingImpactAt){openingImpactAt=tapImpactAt;openingDuration=1.80;}
    }
    const impacted=intro&&Number.isFinite(openingImpactAt),impactAge=impacted?Math.max(0,t-openingImpactAt):0;
    if(impacted)openingBreak=Math.max(openingBreak,smooth(.06,openingDuration,impactAge));
    impactCracks.visible=impacted&&impactAge<1.45;
    const crackGrowth=reduced?1:clamp(impactAge/.32,0,1);
    impactGeometry.setDrawRange(0,Math.max(1,Math.floor(crackSegments.length*crackGrowth))*2);
    impactMaterial.opacity=impacted?(reduced?.18:.72)*(1-smooth(.48,1.45,impactAge)):0;
    impactLight.intensity=impacted&&!reduced?Math.sin(clamp(impactAge/.5,0,1)*Math.PI)*5.2:0;
    const split=openingBreak;
    const intrusion=!intro?clamp(interaction.codeInvasion||0,0,.24):0;
    panes.visible=intro&&split<.999||intrusion>0;
    codeMat.opacity=intro?.82*Math.pow(1-split,1.12):intrusion;
    paneObjects.forEach((p,i)=>{
      p.visible=reduced||!impacted||impactAge<p.userData.breakDelay;p.position.copy(p.userData.base);p.rotation.y=(i===1?.0225:((i%4)-1.5)*-.045);p.rotation.z=0;
      if(intro&&!reduced&&i!==1){p.position.z+=Math.sin(t*.6+i)*.025;p.rotation.z=Math.sin(t*.3+i)*.002;}
      if(!intro){p.visible=intrusion>0&&(i%4===0||i%4===3);p.position.z=-1.3;}
    });
    introFragments.forEach((shard,i)=>{
      shard.visible=intro&&!reduced&&impacted&&impactAge>=paneObjects[shard.userData.index].userData.breakDelay;
      if(!shard.visible)return;
      const data=shard.userData,amount=clamp((impactAge-data.arrivalDelay)/(openingDuration-data.arrivalDelay),0,1),ease=amount*amount;
      shard.position.copy(data.origin).addScaledVector(data.direction,ease*6*data.speed);
      shard.position.y+=Math.sin(amount*Math.PI)*.4-ease*.7;
      shard.position.z+=ease*(3.5+(i%4)*.65);
      shard.rotation.set(data.baseRotation.x+amount*(i%2?1:-1)*2.8,data.baseRotation.y+amount*data.twist,data.baseRotation.z+amount*data.twist*.5);
      shard.scale.setScalar(1-amount*.26);
    });
    const broken=phase==='fracture',bloom=phase==='bloom';
    const keptAmount=bloom?smooth(3,4.2,local):snowScene?1:0;
    savedLight.visible=keptAmount>0;
    seedMaterial.opacity=keptAmount;
    const seedPulse=pulse?.kind==='light'?pulseV:0;
    const breath=reduced?0:Math.sin(t*.85)*.05;
    lightSeed.scale.setScalar(1+(reduced?0:seedPulse*.8+breath));
    lightSeed.rotation.set(reduced?0:t*.16,reduced?0:t*.22,.18);
    seedMaterial.emissiveIntensity=1.65+seedPulse*1.7;
    seedLight.intensity=keptAmount*(1.25+seedPulse*3.2);
    const opening=broken?smooth(0,4,local):bloom?Math.max(0,1-local/3):0;
    rift.visible=broken||bloom;
    riftGold.opacity=opening*.72;riftWhite.opacity=opening*.88;
    rift.scale.x=reduced?1.5:broken?lerp(.45,2.5,smooth(0,5,local)):2.5+local*.2;
    riftEdges.forEach(edge=>{edge.position.x=edge.userData.x+(reduced?0:edge.userData.side*opening*.035);edge.position.y=.044+(reduced?0:opening*.04);});
    const gathered=bloom?lerp(.08,.70,smooth(0,1.2,local))*Math.exp(-Math.max(0,local-1.2)*.55):broken?.08*smooth(9,16,local):0;
    reunionLight.intensity=gathered*35;
    halo.visible=bloom;haloMaterial.opacity=bloom?Math.max(0,.38-local*.11):0;halo.scale.setScalar(reduced?1:1+local*1.6);
    shardMat.opacity=broken?.42:bloom?Math.max(0,.5-local*.13):0;
    shards.forEach((s,i)=>{s.visible=broken||bloom;if(!s.visible)return;const a=s.userData.a;const travel=reduced?.65:bloom?local*.9:smooth(0,4,local)*.65;const r=s.userData.r+travel;s.position.set(Math.cos(a)*r,1.7+Math.sin(a)*r*.68,s.userData.z+(bloom&&!reduced?local*.6:1));s.rotation.set(s.userData.rot+t*.04,s.userData.rot+t*.025,Math.sin(t*.3+i)*.1);if(reduced)s.rotation.set(0,0,s.userData.rot);});
    celebration.forEach((p,i)=>{const release=1-smooth(5.5,8,local);p.visible=bloom&&release>.001;if(!p.visible)return;const age=reduced?0:Math.max(0,local-p.userData.delay);const a=p.userData.a+age*.35;const r=p.userData.r+age*.45;p.position.set(Math.cos(a)*r,1.1+p.userData.y+age*.18,Math.sin(a)*r+age*.6-1);p.rotation.set(age*.5+p.userData.spin,a,age*.7);p.scale.setScalar(reduced?.075:Math.min(.18,.04+age*.04));p.scale.multiplyScalar(release);p.scale.y*=.28;});
  }
  // Bake only immutable opaque architecture into material batches. Interactive
  // objects and all moving/transparent layers retain their original identity.
  // This reduces mobile draw calls without simplifying silhouettes or materials.
  function batchStaticArchitecture(){
    const preserveRoots=new Set([panes,rift,halo,palmSnow,...targets.map(t=>t.object),...snowCaps,...fallen,...shards,...celebration]);
    const isPreserved=object=>{let p=object;while(p&&p!==group){if(preserveRoots.has(p))return true;p=p.parent;}return false;};
    group.updateMatrixWorld(true);
    const inverseRoot=new THREE.Matrix4().copy(group.matrixWorld).invert();
    const buckets=new Map();
    group.traverse(object=>{
      if(!object.isMesh||object.isInstancedMesh||isPreserved(object)||Array.isArray(object.material))return;
      const mat=object.material;
      // Transparent sorting is spatial; preserving those individual objects is
      // essential for the windows and pooled reflections to remain correct.
      if(mat.transparent||mat.opacity<1||!object.geometry?.attributes.position)return;
      const attrs=Object.keys(object.geometry.attributes).sort();
      const layout=attrs.map(name=>name+':'+object.geometry.attributes[name].itemSize).join(',');
      const key=mat.uuid+'|'+layout;
      if(!buckets.has(key))buckets.set(key,{mat,attrs,objects:[]});
      buckets.get(key).objects.push(object);
    });
    const batched=new THREE.Group();batched.name='static-architecture-batches';group.add(batched);
    let originalCount=0,batchCount=0;
    for(const bucket of buckets.values()){
      if(bucket.objects.length<3)continue;
      const baked=[];let vertices=0,casts=false,receives=false;
      for(const object of bucket.objects){
        const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
        const matrix=new THREE.Matrix4().multiplyMatrices(inverseRoot,object.matrixWorld);
        geometry.applyMatrix4(matrix);baked.push(geometry);vertices+=geometry.attributes.position.count;
        casts=casts||object.castShadow;receives=receives||object.receiveShadow;
      }
      const geometry=new THREE.BufferGeometry();
      for(const name of bucket.attrs){
        const size=baked[0].attributes[name].itemSize,data=new Float32Array(vertices*size);let offset=0;
        for(const source of baked){const attribute=source.attributes[name];data.set(attribute.array,offset);offset+=attribute.array.length;}
        geometry.setAttribute(name,new THREE.BufferAttribute(data,size));
      }
      geometry.computeBoundingSphere();geometry.computeBoundingBox();resources.push(geometry);
      const combined=new THREE.Mesh(geometry,bucket.mat);combined.name='architecture-'+bucket.mat.color.getHexString();
      combined.castShadow=casts;combined.receiveShadow=receives;batched.add(combined);
      originalCount+=bucket.objects.length;batchCount++;
      bucket.objects.forEach(object=>object.removeFromParent());
      baked.forEach(geometry=>geometry.dispose());
    }
    group.userData.staticBatching={originalMeshes:originalCount,mergedMeshes:batchCount,savedDrawCalls:originalCount-batchCount};
  }
  batchStaticArchitecture();
  function dispose(){resources.forEach(r=>r.dispose?.());group.traverse(o=>{if(o.geometry&&!resources.includes(o.geometry))o.geometry.dispose();});group.removeFromParent();}
  return {group,update,targets,dispose,landmarks:{codeImpact:codeImpact.clone(),savedLight:new THREE.Vector3(0,.96,.20),flowers:new THREE.Vector3(3,1.6,-2.4),lamp:new THREE.Vector3(-1.9,3,-.9),record:new THREE.Vector3(-4.25,1.98,-3.83)}};
}
