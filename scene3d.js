import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.querySelector('#homeCanvas');
const frame = document.querySelector('#sceneFrame');
const message = document.querySelector('#sceneMessage');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e6dfd4');
scene.fog = new THREE.Fog('#e6dfd4', 28, 58);

const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
camera.position.set(17, 19, 23);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(1.6, .2, .1);
controls.enableDamping = true;
controls.dampingFactor = .08;
controls.minDistance = 13;
controls.maxDistance = 50;
controls.minPolarAngle = .68;
controls.maxPolarAngle = 1.28;
controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
controls.saveState();

scene.add(new THREE.HemisphereLight('#fff6e6','#786b58',2.15));
const sunlight = new THREE.DirectionalLight('#fff0d5',3.1);
sunlight.position.set(-7,17,10);sunlight.castShadow=true;
sunlight.shadow.mapSize.set(2048,2048);sunlight.shadow.camera.left=-19;sunlight.shadow.camera.right=19;sunlight.shadow.camera.top=18;sunlight.shadow.camera.bottom=-15;
scene.add(sunlight);
const fillLight = new THREE.DirectionalLight('#d7e4ff',.65);fillLight.position.set(12,8,-8);scene.add(fillLight);

const world = new THREE.Group();scene.add(world);
const mat = (color,roughness=.78,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const M={wood:mat('#bd9064'),woodDark:mat('#8f684d'),cream:mat('#f5ead7'),wall:mat('#f2e6d4'),rose:mat('#dbaea3'),pink:mat('#edc8bd'),sage:mat('#afbd9f'),green:mat('#829f72'),blue:mat('#a5bdc0'),tile:mat('#d9e8e5'),white:mat('#fffaf0'),dark:mat('#48423f'),metal:mat('#a9a79c',.35,.55),gold:mat('#d6b378',.35,.4),red:mat('#ca7568'),fruit:mat('#df8969'),choc:mat('#7a4b38'),leaf:mat('#6e9465'),leafLight:mat('#a5b58a'),foam:mat('#fff8ed'),water:mat('#9edbe2',.25),glass:new THREE.MeshPhysicalMaterial({color:'#ddf4ee',roughness:.12,metalness:.05,transparent:true,opacity:.32,transmission:.25}),screen:new THREE.MeshStandardMaterial({color:'#282d31',roughness:.25,emissive:'#050606',emissiveIntensity:.35})};
const house = new THREE.Group();world.add(house);
const clickable=[],actorGroups=[],actionGroups=new Map(),solidZones=[],walkers=[];
const v3=(x,y,z)=>new THREE.Vector3(x,y,z);
function box(parent, material, w,h,d,x,y,z, options={}){
  const radius=Math.min(.075,w*.16,h*.16,d*.16);
  const geometry=radius>.004?new RoundedBoxGeometry(w,h,d,2,radius):new THREE.BoxGeometry(w,h,d);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=options.cast!==false;mesh.receiveShadow=options.receive!==false;parent.add(mesh);return mesh;
}
function sphere(parent,material,rx,ry,rz,x,y,z,segments=16){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,segments,Math.max(8,segments-2)),material);mesh.scale.set(rx,ry,rz);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cylinder(parent,material,rt,rb,h,x,y,z,segments=18){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cone(parent,material,r,h,x,y,z,segments=12){const mesh=new THREE.Mesh(new THREE.ConeGeometry(r,h,segments),material);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
function torus(parent,material,r,t,x,y,z,rotationX=0,rotationY=0,rotationZ=0,segments=24){const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,segments),material);mesh.position.set(x,y,z);mesh.rotation.set(rotationX,rotationY,rotationZ);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function rod(parent,material,r,a,b,segments=10){const start=v3(...a),end=v3(...b),delta=end.clone().sub(start),mesh=cylinder(parent,material,r,r,delta.length(),...(start.clone().add(end).multiplyScalar(.5).toArray()),segments);mesh.quaternion.setFromUnitVectors(v3(0,1,0),delta.normalize());return mesh;}
function detailLine(parent,material,w,h,d,x,y,z){return box(parent,material,w,h,d,x,y,z,{cast:false});}
function markSolid(x,z,rx,rz,owner=null){solidZones.push({x,z,rx,rz,owner});}
function roomFloor(x,z,w,d,color){box(house,mat(color),w,.22,d,x,-.12,z);box(house,M.woodDark,w,.12,.08,x,-.03,z+d/2-.06);}
function wall(x,z,w,d,h=1.45,color='#f3e6d4'){
  box(house,mat(color),w,h,d,x,h/2,z);
  markSolid(x,z,Math.max(w/2,.12)+.08,Math.max(d/2,.12)+.08);
}
function wallX(x,z1,z2,gaps=[]){
  let cursor=z1;
  for(const [a,b] of [...gaps,[z2,z2]]){if(a>cursor)wall(x,(cursor+a)/2,.16,a-cursor,1.33);cursor=b;}
}
function wallZ(z,x1,x2,gaps=[]){
  let cursor=x1;
  for(const [a,b] of [...gaps,[x2,x2]]){if(a>cursor)wall((cursor+a)/2,z,a-cursor,.16,1.28);cursor=b;}
}

// Raised dollhouse base and the six warm, individually furnished rooms.
box(house,mat('#9b795c'),16.55,.45,10.55,0,-.42,0);
box(house,mat('#d7c3a8'),16.25,.15,10.25,0,-.15,0);
roomFloor(-5.5,-2.5,4.9,4.9,'#d4b9a5');
roomFloor(-1,-2.5,3.9,4.9,'#c6d9d3');
roomFloor(4.5,-2.5,7.0,4.9,'#dec7a6');
roomFloor(-5.5,2.5,4.9,4.9,'#c5c7ad');
roomFloor(-1,2.5,3.9,4.9,'#d8b9b3');
roomFloor(4.5,2.5,7.0,4.9,'#d9cea5');

// Low front walls keep the cutaway view open; the taller rear walls frame the rooms.
wall(0,-5.05,16.2,.22,2.0,'#f1e4cf');
wall(-8.05,0,.22,10.2,1.55,'#f1e4cf');
wall(8.05,-3.5,.22,3.0,1.5,'#f1e4cf');
wall(8.05,4.4,.22,1.2,1.5,'#f1e4cf');
wall(-2.2,5.03,11.6,.22,.55,'#f1e4cf');wall(7.35,5.03,1.3,.22,.55,'#f1e4cf');
// Room partitions leave generous door openings between each room.
wallX(-3,-5,5,[[-3.65,-2.55],[2.6,3.6]]);
wallX(1,-5,5,[[-3.65,-2.55],[2.6,3.6]]);
wallZ(0,-8,-3,[[-6.25,-5.0]]);wallZ(0,-3,1,[[-1.65,-.35]]);wallZ(0,1,8,[[3.0,4.3]]);

// Garden terrace, path, flower beds and the glass doors to the living room.
box(world,mat('#a5ba91'),5.1,.2,9.7,10.8,-.12,0);
box(world,mat('#b7a483'),1.25,.04,9.1,8.9,.01,0);
for(let i=0;i<8;i++)box(world,mat(i%2?'#d5c8ad':'#c8b99e'),.8,.035,.75,8.8,.06,-3.55+i*1.02);
const gardenDoor=interact('door','Glass garden doors',8.18,2.45,[.42,1.6,2.55]);
box(gardenDoor,mat('#9c7555'),.12,1.42,2.48,0,.71,0);
for(const z of [-.64,.64]){box(gardenDoor,M.glass,.07,1.16,1.2,-.035,.72,z);box(gardenDoor,M.woodDark,.09,1.25,.045,-.02,.72,z);sphere(gardenDoor,M.gold,.055,.055,.055,.08,.68,z+(z<0?.5:-.5),10);}
const gardenBlooms=[];
for(let i=0;i<6;i++){const z=-3.55+i*1.35;box(world,mat('#8f765d'),3.2,.2,.67,10.8,.07,z);markSolid(10.8,z,1.62,.42);for(let j=0;j<5;j++){const x=9.35+j*.72;cylinder(world,M.leaf,.16,.18,.25,x,.3,z,9);for(const side of [-1,1]){const leaf=sphere(world,M.leaf,.13,.045,.07,x+side*.11,.42,z,10);leaf.rotation.z=side*.35;}gardenBlooms.push(sphere(world,[M.rose,M.gold,M.pink,M.red][(i+j)%4],.15,.12,.15,x,.52,z,12));for(let p=0;p<5;p++){const a=p*Math.PI*2/5;gardenBlooms.push(sphere(world,[M.white,M.pink,M.gold][(i+j+p)%3],.075,.07,.075,x+Math.cos(a)*.16,.54,z+Math.sin(a)*.16,9));}}}
// Room names float just above the miniature floor.
function label(text,x,y,z,width=2.4){const c=document.createElement('canvas');c.width=512;c.height=110;const ctx=c.getContext('2d');ctx.fillStyle='rgba(255,250,239,.88)';ctx.beginPath();ctx.roundRect(8,15,496,82,28);ctx.fill();ctx.fillStyle='#705b47';ctx.font='700 36px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,56);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(width,.5,1);world.add(sprite);}
label('OUR BEDROOM',-5.5,2.32,-2.5,2.45);label('BATHROOM',-1,2.32,-2.5,2.15);label('LIVING ROOM',4.5,2.32,-2.5,2.45);label('HIS LITTLE CORNER',-5.5,2.32,2.5,2.7);label('HER HAPPY CORNER',-1,2.32,2.5,2.7);label('SUNNY KITCHEN',4.5,2.32,2.5,2.45);label('LITTLE GARDEN',10.8,2.3,-4.3,2.2);

function interact(action,name,x,z,size=[1,1,1],options={}){
  const group=new THREE.Group();group.position.set(x,0,z);group.userData={action,name,size,approach:options.approach||'auto'};house.add(group);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false}));hit.position.y=size[1]/2;group.add(hit);clickable.push(group);
  if(!actionGroups.has(action))actionGroups.set(action,[]);actionGroups.get(action).push(group);
  if(options.solid!==false)markSolid(x,z,Math.max(size[0]/2,.36),Math.max(size[2]/2,.36),group);return group;
}
function plant(parent,x,y,z,flowers=true){markSolid(x,z,.3,.3);cylinder(parent,mat('#a98463'),.23,.3,.38,x,y+.19,z,16);torus(parent,M.woodDark,.235,.025,x,y+.36,z,Math.PI/2,0,0,20);cylinder(parent,mat('#554d40'),.19,.19,.025,x,y+.375,z,16);for(let i=0;i<6;i++){const a=i*Math.PI/3,tip=[x+Math.cos(a)*.15,y+.78+(i%2)*.05,z+Math.sin(a)*.15];const leaf=sphere(parent,M.leaf,.12,.31,.085,x+Math.cos(a)*.15,y+.54,z+Math.sin(a)*.15,12);leaf.rotation.z=Math.cos(a)*.45;leaf.rotation.x=Math.sin(a)*.4;rod(parent,M.leafLight,.009,[x+Math.cos(a)*.15,y+.43,z+Math.sin(a)*.15],tip,6);}if(flowers){for(let i=0;i<3;i++){const px=x+(i-1)*.16,py=y+.8+(i%2)*.12;sphere(parent,[M.pink,M.gold,M.rose][i],.12,.12,.12,px,py,z,10);for(let p=0;p<5;p++){const a=p*Math.PI*2/5;sphere(parent,M.cream,.025,.035,.025,px+Math.cos(a)*.1,py,z+Math.sin(a)*.1,8);}}}}
function table(parent,x,z,w=1.5,d=.85,h=.75,color=M.wood){box(parent,color,w,.14,d,x,h,z);for(const dx of [-w*.42,w*.42])for(const dz of [-d*.38,d*.38])box(parent,M.woodDark,.09,h,.09,x+dx,h/2,z+dz);}

// Bedroom: double bed, two plush friends, framed photo, wardrobe and dressing table.
const bed=interact('sleep','Our bed',-5.45,-2.35,[2.85,1.6,2.2]);
box(bed,M.woodDark,2.7,.32,2.05,0,.28,0);box(bed,M.cream,2.52,.28,1.88,0,.52,.02);box(bed,M.pink,2.47,.18,1.25,0,.72,.25);box(bed,M.white,2.42,.18,.48,0,.73,-.55);box(bed,M.wood,2.8,.24,.18,0,.78,-1.02);
for(const x of [-.7,.7]){const pillow=box(bed,M.white,.78,.18,.46,x,.76,-.65);pillow.rotation.y=-.07;detailLine(bed,M.rose,.5,.012,.015,x,.855,-.65);sphere(bed,M.pink,.035,.022,.03,x,.86,-.65,10);}
for(const x of [-.98,.98]){box(bed,M.wood,.12,.46,.12,x,.21,.78);box(bed,M.wood,.12,.46,.12,x,.21,-.72);sphere(bed,M.gold,.055,.055,.055,x,.49,.78,10);}
for(let i=0;i<7;i++){const x=-.93+i*.31;detailLine(bed,M.rose,.018,.014,.34,x,.817,.32);}
const bear=interact('hug-bear','Teddy bear',-6.12,-2.72,[.72,.8,.72],{solid:false});bear.position.y=.8;const bearFur=mat('#b78965'),bearMuzzle=mat('#d7b698');sphere(bear,bearFur,.27,.31,.23,0,.33,0);sphere(bear,bearFur,.24,.24,.22,0,.68,-.01);for(const x of [-.16,.16]){sphere(bear,bearFur,.1,.12,.1,x,.86,-.01);sphere(bear,mat('#6f5140'),.035,.04,.03,x,.7,.19);}sphere(bear,M.dark,.025,.03,.025,0,.62,.22);sphere(bear,bearMuzzle,.105,.075,.045,0,.59,.205);for(const x of [-.24,.24]){const paw=sphere(bear,bearFur,.105,.17,.1,x,.32,.18);paw.rotation.z=x<0?-.35:.35;sphere(bear,bearMuzzle,.055,.055,.025,x,.28,.26,10);}sphere(bear,mat('#dca19b'),.12,.035,.025,0,.44,.22,10);
const swan=interact('hug-swan','Swan plush',-4.85,-2.72,[.76,.7,.72],{solid:false});swan.position.y=.72;const swanBody=sphere(swan,M.white,.31,.18,.23,0,.25,0);const swanWing=sphere(swan,M.cream,.21,.11,.17,-.04,.3,.18);swanWing.rotation.z=.2;const farWing=sphere(swan,M.white,.18,.1,.15,-.11,.3,-.14);farWing.rotation.z=-.18;for(let i=0;i<3;i++){const feather=sphere(swan,M.cream,.07,.09,.08,-.18-i*.025,.24,-.18-i*.045,10);feather.rotation.z=-.35;}const neck=sphere(swan,M.white,.11,.32,.12,.16,.48,-.03);neck.rotation.z=-.28;sphere(swan,M.white,.16,.12,.12,.28,.72,-.02);cone(swan,M.gold,.065,.17,.41,.7,-.02,10).rotation.z=-Math.PI/2;sphere(swan,M.dark,.025,.025,.025,.3,.76,.09,10);sphere(swan,M.rose,.09,.035,.1,.04,.19,.22,10);
const photo=interact('photo','Our photo',-4.18,-4.64,[.95,1.35,.28]);box(photo,M.gold,.92,1.12,.09,0,1.35,0);box(photo,M.cream,.78,.96,.035,0,1.35,.07);
new THREE.TextureLoader().load('assets/our-photo.jpg',texture=>{texture.colorSpace=THREE.SRGBColorSpace;const pic=new THREE.Mesh(new THREE.PlaneGeometry(.73,.90),new THREE.MeshBasicMaterial({map:texture}));pic.position.set(0,1.35,.095);photo.add(pic);});
for(const x of [-.32,.32])sphere(photo,M.gold,.045,.045,.035,x,.84,.08);
const wardrobe=interact('clothes','Wardrobe',-3.62,-1.35,[.95,2.0,1.05]);box(wardrobe,M.woodDark,.86,1.78,.06,0,.96,-.43);for(const x of [-.44,.44])box(wardrobe,M.wood,.07,1.86,.9,x,.94,0);box(wardrobe,M.wood,.9,.08,.88,0,.06,0);box(wardrobe,M.woodDark,.9,.08,.88,0,1.86,0);box(wardrobe,M.wood,.84,.06,.82,0,1.49,-.01);rod(wardrobe,M.metal,.025,[-.34,1.65,.22],[.34,1.65,.22],12);for(let i=0;i<5;i++){const x=-.28+i*.14,color=[M.blue,M.rose,M.sage,M.gold,M.cream][i];rod(wardrobe,M.gold,.008,[x,1.58,.22],[x-.055,1.51,.22],6);rod(wardrobe,M.gold,.008,[x,1.58,.22],[x+.055,1.51,.22],6);box(wardrobe,color,.12,.62,.035,x,1.15,.23);box(wardrobe,color,.055,.46,.04,x-.08,1.2,.22);box(wardrobe,color,.055,.46,.04,x+.08,1.2,.22);}const closetDoors=[];for(const [side,color] of [[-1,M.cream],[1,M.pink]]){const door=new THREE.Group();door.position.set(side*.46,.95,.45);wardrobe.add(door);const panelX=-side*.22;box(door,color,.39,1.52,.04,panelX,0,.02);box(door,M.white,.29,1.35,.018,panelX,0,.045);for(const y of [-.56,.57])detailLine(door,M.woodDark,.29,.012,.012,panelX,y,.058);sphere(door,M.gold,.035,.035,.035,-side*.07,0,.09);closetDoors.push(door);}wardrobe.userData.closetDoors=closetDoors;
const vanity=interact('skincare','Vanity table',-3.77,-3.57,[1.0,1.3,.95]);table(vanity,0,.08,1.05,.62,.66,M.wood);box(vanity,M.cream,.63,.22,.12,0,.48,.29);for(const x of [-.22,0,.22]){sphere(vanity,M.gold,.025,.025,.025,x,.48,.36,8);cylinder(vanity,[M.rose,M.gold,M.white][Math.round((x+.22)*5)%3],.06,.07,.2,x,.82,.06,12);cylinder(vanity,M.gold,.075,.075,.035,x,.94,.06,12);}cylinder(vanity,M.gold,.36,.36,.04,0,.73,-.16,24);box(vanity,M.gold,.6,.73,.07,0,1.2,-.39);sphere(vanity,M.blue,.22,.3,.03,0,1.18,-.34);for(const x of [-.3,-.1,.12,.3])cylinder(vanity,[M.rose,M.gold,M.white,M.green][Math.round((x+.3)*5)%4],.055,.06,.22,x,.83,.06,10);box(vanity,M.rose,.46,.12,.42,0,.42,.72);for(const dx of [-.16,.16])for(const dz of [.58,.86])box(vanity,M.woodDark,.04,.38,.04,dx,.2,dz);
plant(house,-7.15,.02,-.8);plant(house,-7.2,.02,4.35);

// Bathroom: tiled floor, tub, shower, toilet and the shared sink.
const tub=interact('bath','Bath tub',-2.0,-4.0,[1.65,.85,1.45]);box(tub,M.white,1.55,.42,1.35,0,.25,0);box(tub,M.blue,1.22,.08,1.04,0,.48,0);box(tub,M.white,1.18,.05,1.0,0,.54,0);for(const x of [-.55,.55]){cylinder(tub,M.metal,.055,.055,.42,x,.73,-.42,12).rotation.x=Math.PI/2;cylinder(tub,M.gold,.07,.07,.045,x,.76,-.24,12);sphere(tub,M.rose,.035,.035,.035,x,.79,-.2,8);}torus(tub,M.metal,.09,.025,.48,.58,-.38,Math.PI/2);cylinder(tub,M.metal,.055,.055,.42,.55,.73,-.42,12).rotation.x=Math.PI/2;for(let i=0;i<8;i++){const b=sphere(tub,M.foam,.055,.04,.045,-.48+(i%4)*.28,.62,-.24+Math.floor(i/4)*.28,8);b.userData.bubble=true;}
const shower=interact('shower','Shower',-.15,-4.0,[1.1,2.1,1.2]);box(shower,M.glass,.05,1.75,1.0,-.48,.95,0);box(shower,M.glass,1.0,1.75,.05,0,.95,-.48);cylinder(shower,M.metal,.05,.05,.9,0,1.95,-.42,12).rotation.z=Math.PI/2;const showerHead=cylinder(shower,M.metal,.2,.08,.14,.38,1.94,-.42,16);showerHead.rotation.z=Math.PI/2;torus(shower,M.gold,.13,.025,.38,1.86,-.42,Math.PI/2);cylinder(shower,M.metal,.045,.045,.44,.38,.64,-.42,12);for(const x of [.18,.56]){cylinder(shower,M.gold,.07,.07,.04,x,.66,-.42,12);cylinder(shower,M.rose,.025,.025,.14,x,.75,-.42,8);}
const toilet=interact('toilet','Toilet',.45,-1.0,[.85,1.0,.9]);toilet.rotation.y=Math.PI;cylinder(toilet,M.white,.32,.4,.4,0,.25,0,20);sphere(toilet,M.white,.34,.2,.43,0,.44,.12);torus(toilet,M.white,.25,.045,0,.51,.13,Math.PI/2,0,0,24);box(toilet,M.white,.58,.65,.2,0,.58,-.25);box(toilet,M.cream,.46,.08,.06,0,.81,-.14);cylinder(toilet,M.metal,.025,.025,.04,.2,.84,-.12,8);cylinder(toilet,M.white,.22,.22,.22,.47,.69,.22,16);cylinder(toilet,M.woodDark,.11,.11,.05,.47,.82,.22,12);cylinder(toilet,M.metal,.025,.025,.24,.78,.76,-.2,10).rotation.x=Math.PI/2;cylinder(toilet,M.white,.16,.16,.06,.78,.76,-.33,16);sphere(toilet,M.gold,.055,.025,.055,.47,.84,.22,12);cylinder(toilet,M.metal,.025,.025,.15,-.22,.59,-.4,10).rotation.x=Math.PI/2;torus(toilet,M.cream,.24,.018,0,.52,.13,Math.PI/2,0,0,24);
const sink=interact('wash-hands','Shared sink',-.85,-.78,[1.25,1.1,.7]);box(sink,M.wood,.95,.18,.55,0,.68,0);sphere(sink,M.white,.37,.14,.22,0,.8,0);cylinder(sink,M.metal,.035,.035,.4,0,1.0,-.12,12);cylinder(sink,M.metal,.04,.04,.23,0,1.17,-.3,12).rotation.x=Math.PI/2;for(const x of [-.28,.28]){cylinder(sink,M.rose,.06,.07,.23,x,.83,.28,12);cylinder(sink,M.white,.05,.05,.22,x,.99,.28,12);sphere(sink,M.gold,.06,.025,.06,x,1.11,-.28,10);}box(sink,M.gold,.92,.08,.055,0,1.48,-.34);box(sink,M.blue,.76,.68,.04,0,1.83,-.35);torus(sink,M.white,.055,.015,0,1.84,-.315,0,0,0,12);for(const x of [-.38,.38]){cylinder(sink,M.white,.1,.12,.2,x,.96,.1,12);cylinder(sink,M.rose,.055,.05,.05,x,1.08,.1,12);cylinder(sink,M.white,.035,.04,.25,x,.13,.1,10);cylinder(sink,M.blue,.04,.04,.07,x,.27,.1,10);}
const soap=box(sink,M.rose,.19,.11,.12,.28,.94,-.08);sphere(sink,M.white,.055,.04,.03,.28,1.01,-.08,8);box(sink,M.white,.11,.28,.06,-.42,1.0,-.04);box(sink,M.blue,.13,.12,.065,-.42,1.13,-.04);
const hose=interact('water-play','Play with water',.82,-3.0,[.45,.8,.45]);cylinder(hose,M.green,.11,.13,.65,0,.4,0,14);
const brush=interact('brush-teeth','Toothbrushes',-.35,-.05,[.6,.75,.45]);for(const x of [-.14,.14]){cylinder(brush,M.white,.09,.1,.24,x,.12,0,12);cylinder(brush,M.rose,.025,.025,.48,x,.48,0,10);box(brush,M.white,.1,.1,.05,x,.74,0);}
box(house,M.tile,3.2,.035,2.0,-1,-.005,-1.3);

// Living room: sofa, husky rug, coffee table, TV, games, speaker, lamp and washer.
const tv=interact('tv','Television',4.55,-4.48,[2.35,2.0,.7]);box(tv,M.wood,2.05,.42,.48,0,.35,0);for(const x of [-.78,.78])box(tv,M.woodDark,.1,.35,.1,x,.17,.14);box(tv,M.dark,1.99,1.28,.12,0,1.26,.12);const screen=box(tv,M.screen,1.83,1.12,.06,0,1.28,.2);screen.name='tv-screen';box(tv,M.woodDark,1.95,.1,.14,0,.62,.23);box(tv,M.wood,.18,.12,.14,0,.68,.25);for(let i=0;i<3;i++)sphere(tv,i===0?M.red:M.gold,.025,.025,.025,.82+i*.06,.61,.31,8);cylinder(tv,M.dark,.035,.035,.025,.78,.61,.31,8);
const sofa=interact('rest','Comfy sofa',4.55,-.9,[3.25,1.35,1.5]);sofa.rotation.y=Math.PI;box(sofa,M.rose,3.1,.48,.95,0,.5,0);box(sofa,M.rose,3.1,1.0,.28,0,.96,-.52);for(const x of [-1.53,1.53]){box(sofa,M.pink,.26,.85,1.1,x,.63,-.02);box(sofa,M.rose,.035,.6,.82,x,.67,-.02);for(let j=0;j<2;j++)cylinder(sofa,M.woodDark,.08,.08,.56,x,.28,(j-.5)*.75,10);}
for(const x of [-.72,.72]){const cushion=box(sofa,M.pink,1.0,.18,.72,x,.78,.03);cushion.rotation.y=x*.08;for(const sx of [-.34,.34])for(const sz of [-.22,.22])sphere(sofa,M.rose,.022,.014,.022,x+sx,.88,sz+.03,8);}
for(let i=0;i<12;i++)detailLine(sofa,M.rose,.018,.012,.025,-1.28+i*.23,.76,.5);
const rug=new THREE.Group();rug.position.set(4.55,0,-2.62);house.add(rug);sphere(rug,mat('#e8daca'),1.22,.08,.7,0,.06,0,24);sphere(rug,mat('#96999a'),.4,.1,.38,0,.13,-.05);for(const x of [-.25,.25]){sphere(rug,M.dark,.07,.055,.08,x,.2,-.1);cone(rug,mat('#7f8384'),.19,.35,x*1.6,.18,-.35,10);}sphere(rug,M.white,.16,.08,.14,0,.21,.16);
const sweetsBowl=interact('treats','Bowl of sweets',4.55,-2.62,[1.25,.9,.9]);table(sweetsBowl,0,0,1.2,.76,.48,M.woodDark);cylinder(sweetsBowl,M.cream,.24,.35,.15,0,.6,0,22);for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(sweetsBowl,i%2?M.choc:M.red,.12,.09,.12,Math.cos(a)*.19,.75,Math.sin(a)*.19,12);}
const console=interact('game','Game console',2.15,-1.0,[.85,.55,.75]);box(console,M.dark,.62,.2,.42,0,.35,0);for(const x of [-.38,.38]){sphere(console,M.dark,.16,.07,.13,x,.3,.38,12);cylinder(console,M.white,.025,.025,.12,x,.39,.4,8);for(let i=0;i<4;i++)sphere(console,[M.rose,M.gold,M.blue,M.green][i],.018,.018,.018,x+(i%2)*.045-.022,.35,.48+Math.floor(i/2)*.045,8);}
const speaker=interact('music','Little speaker',7.15,-2.15,[.7,1.0,.7]);box(speaker,M.woodDark,.52,.72,.46,0,.48,0);box(speaker,M.wood,.42,.62,.035,0,.48,.245);for(const y of [.34,.61]){cylinder(speaker,M.dark,.14,.14,.04,0,y,.27,16);torus(speaker,M.gold,.1,.012,0,y,.3,Math.PI/2,0,0,20);sphere(speaker,M.wood,.035,.035,.025,0,y,.31,10);}for(let i=0;i<3;i++)sphere(speaker,M.gold,.018,.018,.018,-.12+i*.12,.83,.26,8);
const washer=interact('laundry','Washing machine',7.1,-4.0,[1.0,1.45,1.0]);box(washer,M.white,.9,1.2,.82,0,.66,0);box(washer,M.blue,.76,.2,.035,0,1.12,.43);for(let i=0;i<3;i++)cylinder(washer,i===0?M.gold:M.metal,.045,.045,.035,-.28+i*.2,1.12,.46,12);cylinder(washer,M.blue,.32,.32,.08,0,.57,.45,24).rotation.x=Math.PI/2;torus(washer,M.white,.28,.045,0,.57,.5,Math.PI/2,0,0,24);cylinder(washer,M.metal,.21,.21,.015,0,.57,.51,24).rotation.x=Math.PI/2;for(let i=0;i<5;i++)sphere(washer,M.white,.035,.025,.03,-.13+i*.06,.58,.53,8);
const lamp=interact('lamp','Floor lamp',7.45,-.65,[.5,2.4,.5]);cylinder(lamp,M.gold,.32,.38,.12,0,.08,0,16);for(let i=0;i<3;i++)cylinder(lamp,M.woodDark,.06-i*.012,.055-i*.012,.06,0,.18+i*.07,0,12);cylinder(lamp,M.woodDark,.045,.045,1.6,0,.94,0,12);const lampShade=cone(lamp,M.cream,.34,.5,0,1.95,0,16),lampBulb=sphere(lamp,new THREE.MeshStandardMaterial({color:'#ffe2a5',emissive:'#f6c66f',emissiveIntensity:.05}),.12,.1,.12,0,1.79,0,12),lampLight=new THREE.PointLight('#ffdda4',0,5,2);lampLight.position.set(0,1.78,.02);lamp.add(lampLight);lamp.userData.lit=false;lamp.userData.light=lampLight;lamp.userData.bulb=lampBulb;
const clock=interact(null,'A little wall clock',6.9,-4.75,[.55,.6,.25]);cylinder(clock,M.woodDark,.3,.3,.12,0,1.65,0,24);const clockFace=cylinder(clock,M.cream,.25,.25,.13,0,1.65,.08,24);clockFace.rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i*Math.PI/6;sphere(clock,M.woodDark,.018,.018,.012,Math.sin(a)*.2,1.65+Math.cos(a)*.2,.16,8);}box(clock,M.dark,.018,.14,.018,0,1.69,.17);box(clock,M.rose,.13,.018,.018,.055,1.62,.18);

// His room: desk, monitor, books and a glass case of tiny robot models.
const desk=interact('work','Computer desk',-5.55,.55,[2.0,1.7,1.1]);table(desk,0,0,1.85,.82,.82,M.wood);box(desk,M.dark,1.05,.72,.12,0,1.28,-.3);box(desk,M.blue,.93,.57,.035,0,1.29,-.22);box(desk,M.dark,.72,.055,.28,0,1.16,.25);cylinder(desk,M.dark,.045,.045,.35,0,1.0,-.1,12);for(let i=0;i<5;i++)box(desk,M.cream,.09,.025,.02,-.35+i*.17,1.2,.2);sphere(desk,M.dark,.025,.025,.025,0,1.64,-.22,8);for(let row=0;row<3;row++)for(let col=0;col<10;col++)box(desk,(row===0&&col===9)?M.gold:M.cream,.052,.018,.055,-.32+col*.071,1.19,.16+row*.065);box(desk,M.dark,.16,.045,.22,.62,1.15,.23);sphere(desk,M.blue,.04,.018,.05,.62,1.18,.24,10);rod(desk,M.dark,.012,[.62,1.11,.23],[.7,1.0,.27],8);
const bookshelf=interact('read','Bookshelf',-7.3,2.8,[.9,2.25,1.05]);box(bookshelf,M.woodDark,.82,2.1,.8,0,1.05,0);for(const y of [.44,1.0,1.56]){box(bookshelf,M.wood,.78,.08,.83,0,y,0);for(let i=0;i<4;i++)box(bookshelf,[M.red,M.blue,M.green,M.gold][i],.12,.38,.36,-.28+i*.18,y+.22,0);}
const figures=interact('figures','Little model shelf',-3.8,4.05,[1.0,1.9,.95]);box(figures,M.glass,.9,1.65,.8,0,.86,0);box(figures,M.wood,.95,.12,.86,0,.06,0);for(let i=0;i<3;i++){cylinder(figures,[M.white,M.red,M.blue][i],.08,.12,.5,-.26+i*.25,.39,0,10);sphere(figures,[M.white,M.gold,M.dark][i],.12,.12,.12,-.26+i*.25,.72,0,12);}
const chair=interact('work','Desk chair',-4.55,1.75,[.8,1.15,.8]);const computerDesk=actionGroups.get('work').find(g=>g.userData.name==='Computer desk');chair.rotation.y=Math.atan2(computerDesk.position.x-chair.position.x,computerDesk.position.z-chair.position.z);box(chair,M.rose,.58,.48,.52,0,.6,0);box(chair,M.pink,.5,.08,.4,0,.86,.03);box(chair,M.rose,.58,.7,.15,0,1.05,-.18);box(chair,M.pink,.42,.035,.34,0,.88,.02);for(let i=0;i<5;i++)detailLine(chair,M.cream,.014,.014,.23,-.21+i*.105,.94,-.095);cylinder(chair,M.metal,.06,.06,.48,0,.25,0,10);for(const x of [-.37,.37]){box(chair,M.woodDark,.08,.08,.55,x,.74,-.02);cylinder(chair,M.woodDark,.045,.045,.25,x,.66,.23,10);}for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(chair,M.metal,.32,.045,.06,Math.cos(a)*.15,.08,Math.sin(a)*.15);sphere(chair,M.dark,.045,.045,.045,Math.cos(a)*.27,.04,Math.sin(a)*.27,8);}

// Her room: vanity, full-length mirror, handbag display and another bookshelf.
const makeup=interact('makeup','Makeup table',-.85,.65,[1.75,1.6,1.05]);table(makeup,0,0,1.62,.72,.77,M.wood);box(makeup,M.gold,.72,.7,.07,0,1.18,-.35);box(makeup,M.white,.58,.56,.025,0,1.18,-.305);sphere(makeup,M.blue,.26,.34,.035,0,1.18,-.27);for(let i=0;i<6;i++){cylinder(makeup,[M.rose,M.red,M.gold,M.white,M.green,M.blue][i],.07,.08,.28,-.58+i*.23,.98,.06,10);cylinder(makeup,M.gold,.075,.075,.025,-.58+i*.23,1.135,.06,12);}for(let i=0;i<4;i++)rod(makeup,M.woodDark,.018,[-.65+i*.08,1.03,.25],[-.59+i*.08,1.35,.25],8);cylinder(makeup,M.rose,.18,.2,.06,.49,.98,.13,18);torus(makeup,M.gold,.12,.015,.49,1.02,.17,0,0,0,16);box(makeup,M.rose,.5,.12,.46,0,.42,.78);for(const dx of [-.18,.18])for(const dz of [.62,.94])box(makeup,M.woodDark,.045,.38,.045,dx,.2,dz);box(makeup,M.cream,.44,.18,.08,0,.54,.4);
const mirror=interact('mirror','Full length mirror',.3,4.0,[.72,2.3,.55]);box(mirror,M.gold,.64,2.05,.12,0,1.05,0);box(mirror,M.cream,.53,1.9,.04,0,1.08,.08);box(mirror,M.blue,.45,1.79,.025,0,1.08,.11);box(mirror,M.gold,.75,.09,.22,0,.05,.04);sphere(mirror,M.rose,.08,.08,.06,-.31,.2,.05,10);sphere(mirror,M.rose,.08,.08,.06,.31,.2,.05,10);
const bags=interact('bags','Handbag cabinet',.15,2.55,[1.25,1.45,1.0]);box(bags,M.glass,1.08,1.35,.78,0,.72,0);box(bags,M.wood,.12,1.44,.88,-.58,.72,0);box(bags,M.wood,.12,1.44,.88,.58,.72,0);for(const y of [.12,.58,1.12])box(bags,M.woodDark,1.07,.055,.76,0,y,0);for(let i=0;i<3;i++){const bx=-.3+i*.3,by=.32+(i%2)*.42;const bag=box(bags,[M.rose,M.gold,M.green][i],.38,.35,.25,bx,by,.12);bag.rotation.y=(i-1)*.16;box(bags,M.cream,.16,.13,.02,bx,by,.26);torus(bags,M.woodDark,.09,.018,bx,by+.24,.12,0,0,0,14);for(const dx of [-.11,.11])detailLine(bags,M.woodDark,.012,.12,.012,bx+dx,by,.25);sphere(bags,M.gold,.025,.025,.02,bx,by,.28,8);}
const herBooks=interact('read','Her bookshelf',-2.55,4.0,[.8,2.0,.9]);box(herBooks,M.woodDark,.68,1.9,.68,0,.95,0);for(const y of [.5,1.1,1.65])for(let i=0;i<3;i++)box(herBooks,[M.rose,M.gold,M.green][i],.12,.36,.35,-.2+i*.2,y,0);

// Sunny kitchen, stocked refrigerator, coffee, water, cooking, dining and dishes.
const fridge=interact('fridge','Open the fridge',2.05,3.85,[1.35,2.3,1.15]);fridge.rotation.y=Math.PI;box(fridge,M.white,1.22,2.15,.09,0,1.08,-.43);for(const x of [-.57,.57])box(fridge,M.white,.08,2.1,.96,x,1.08,.02);box(fridge,M.white,1.16,.08,.96,0,.04,.02);box(fridge,M.white,1.16,.08,.96,0,2.12,.02);box(fridge,M.cream,1.08,1.98,.035,0,1.08,-.37);for(const y of [.42,.86,1.3,1.68]){box(fridge,M.white,1.02,.045,.78,0,y,.02);box(fridge,M.blue,.98,.025,.04,0,y,.39);}for(let i=0;i<5;i++){const x=-.38+(i%3)*.38,z=.05+Math.floor(i/3)*.2;const fruit=sphere(fridge,[M.red,M.gold,M.green,M.fruit,M.rose][i],.12,.13,.12,x,.57+(i%2)*.07,z,12);fruit.rotation.z=(i-2)*.1;}for(const x of [-.34,.05,.36]){cylinder(fridge,[M.white,M.red,M.green][Math.round((x+.34)*3)],.07,.08,.25,x,1.02,.12,12);cylinder(fridge,M.cream,.075,.075,.035,x,1.16,.12,12);}const doorL=new THREE.Group();doorL.position.set(-.61,0,.51);fridge.add(doorL);box(doorL,M.blue,.6,2.05,.07,.3,1.08,0);box(doorL,M.white,.53,1.96,.018,.3,1.08,.04);box(doorL,M.gold,.045,.45,.045,.52,1.1,.08);box(doorL,M.cream,.22,.12,.025,.3,.34,.06);for(let i=0;i<3;i++)box(doorL,M.white,.18,.035,.12,.3,.43+i*.13,.12);const doorR=new THREE.Group();doorR.position.set(.61,0,.51);fridge.add(doorR);box(doorR,M.white,.6,2.05,.07,-.3,1.08,0);box(doorR,M.cream,.53,1.96,.018,-.3,1.08,.04);box(doorR,M.gold,.045,.45,.045,-.52,1.1,.08);fridge.userData.fridgeDoors=[doorL,doorR];
for(let i=0;i<7;i++){const x=3.0+i*.69;box(house,M.wood,.66,.78,.62,x,.39,4.55);box(house,M.white,.7,.08,.68,x,.83,4.55);markSolid(x,4.55,.38,.36);}
const water=interact('drink-water','Water dispenser',2.5,1.15,[.75,1.75,.9]);box(water,M.white,.62,1.25,.65,0,.63,0);cylinder(water,M.blue,.24,.27,.62,0,1.62,0,18);cylinder(water,M.white,.23,.23,.06,0,1.95,0,18);box(water,M.blue,.44,.1,.06,0,1.27,.34);cylinder(water,M.metal,.13,.13,.18,0,1.36,.34,14);cylinder(water,M.white,.12,.13,.035,0,1.24,.44,12);for(const x of [-.2,.2]){cylinder(water,M.gold,.035,.035,.09,x,1.34,.36,10);sphere(water,M.red,.035,.035,.035,x,1.41,.36,8);}box(water,M.metal,.4,.04,.24,0,.18,.23);
const coffee=interact('coffee','Coffee machine',3.35,3.65,[.9,1.3,.95]);box(coffee,M.dark,.75,1.05,.67,0,.55,0);box(coffee,M.metal,.5,.28,.06,0,.91,.35);for(let i=0;i<3;i++)sphere(coffee,[M.red,M.gold,M.green][i],.03,.03,.025,-.18+i*.18,.94,.39,8);box(coffee,M.woodDark,.06,.32,.08,0,.61,.35);cylinder(coffee,M.cream,.16,.2,.19,.05,.2,.25,16);cylinder(coffee,M.choc,.14,.14,.035,.05,.31,.25,16);torus(coffee,M.white,.14,.018,.05,.31,.29,Math.PI/2,0,0,18);cylinder(coffee,M.gold,.045,.045,.14,.05,.48,.19,10);box(coffee,M.cream,.45,.045,.3,0,.04,.12);for(let i=0;i<4;i++)sphere(coffee,M.metal,.025,.025,.025,-.24+i*.16,.76,.37,8);
const stove=interact('cook','Sunny-side-up egg',6.8,1.15,[1.15,1.45,1.0]);box(stove,M.wood,.98,.76,.84,0,.38,0);box(stove,M.dark,.94,.06,.8,0,.8,0);for(const x of [-.28,.28]){cylinder(stove,M.metal,.2,.2,.035,x,.85,-.14,18);torus(stove,M.gold,.14,.018,x,.88,-.14,Math.PI/2,0,0,20);}cylinder(stove,M.dark,.36,.035,.13,0,1.0,.06,20);cylinder(stove,M.metal,.25,.26,.12,0,1.07,.06,20);const pan=torus(stove,M.dark,.28,.035,0,1.16,.06,0,0,0,24);sphere(stove,M.white,.21,.07,.2,0,1.1,.06,16);sphere(stove,M.gold,.07,.055,.07,.08,1.16,.06,14);rod(stove,M.dark,.035,[.22,1.12,.06],[.52,1.12,.06],12);for(let i=0;i<3;i++)cylinder(stove,M.metal,.045,.045,.045,-.3+i*.3,.72,.44,10);
const dining=interact('eat','Dining table',4.95,1.6,[1.95,1.45,1.25]);table(dining,0,0,1.8,1.0,.78,M.woodDark);cylinder(dining,M.white,.28,.34,.08,0,.88,0,24);sphere(dining,M.gold,.13,.045,.11,0,.96,0,16);
for(const x of [-1.4,1.4]){const chair=new THREE.Group();chair.position.set(x,0,0);chair.rotation.y=x<0?Math.PI/2:-Math.PI/2;dining.add(chair);box(chair,M.sage,.48,.12,.48,0,.58,0);box(chair,M.woodDark,.46,.7,.09,0,.96,-.18);for(const dx of [-.18,.18])for(const dz of [-.17,.17])box(chair,M.woodDark,.045,.58,.045,dx,.29,dz);}
const dishwasher=interact('dishes','Dishwasher',4.35,3.65,[.9,1.2,.8]);box(dishwasher,M.white,.8,1.0,.65,0,.5,0);box(dishwasher,M.cream,.72,.08,.56,0,.72,-.03);for(let i=0;i<3;i++){const plate=cylinder(dishwasher,M.white,.1,.1,.025,-.2+i*.2,.78,.2,12);plate.rotation.x=Math.PI/2;torus(dishwasher,M.gold,.078,.008,-.2+i*.2,.78,.22,Math.PI/2,0,0,12);}for(let i=0;i<5;i++)rod(dishwasher,M.metal,.012,[-.29+i*.14,.58,.08],[-.29+i*.14,.71,.08],8);const dishwasherDoor=new THREE.Group();dishwasherDoor.position.set(0,.62,.34);dishwasher.add(dishwasherDoor);box(dishwasherDoor,M.metal,.68,.42,.055,0,-.21,0);box(dishwasherDoor,M.white,.58,.31,.025,0,-.21,.04);box(dishwasherDoor,M.dark,.18,.025,.025,0,-.07,.06);dishwasher.userData.door=dishwasherDoor;cylinder(dishwasher,M.gold,.035,.035,.03,.25,.9,.35,8);
const kitchenSink=interact('wash-hands','Kitchen sink',5.65,3.65,[.9,1.15,.85]);box(kitchenSink,M.wood,.82,.18,.72,0,.72,0);sphere(kitchenSink,M.metal,.27,.1,.24,0,.84,.02);cylinder(kitchenSink,M.metal,.035,.035,.42,0,1.05,-.2,10);cylinder(kitchenSink,M.metal,.035,.035,.2,0,1.24,-.38,10).rotation.x=Math.PI/2;torus(kitchenSink,M.dark,.14,.018,0,.85,.02,Math.PI/2,0,0,18);for(const x of [-.24,.24]){cylinder(kitchenSink,M.gold,.05,.05,.045,x,.84,-.25,10);cylinder(kitchenSink,M.metal,.025,.025,.14,x,.93,-.25,8);}box(kitchenSink,M.green,.16,.11,.06,.27,.9,.23);for(let i=0;i<4;i++)detailLine(kitchenSink,M.white,.015,.06,.016,.22+i*.035,.9,.27);cylinder(kitchenSink,M.white,.12,.13,.18,-.28,.86,.12,12);sphere(kitchenSink,M.rose,.08,.035,.06,-.28,.97,.12,10);
const bowl=interact('feed',"Mochi's bowl",7.2,3.8,[.78,.5,.72]);cylinder(bowl,M.gold,.32,.42,.18,0,.13,0,20);cylinder(bowl,M.woodDark,.3,.33,.08,0,.22,0,20);for(let i=0;i<5;i++)sphere(bowl,M.choc,.055,.04,.05,(i-2)*.1,.31,(i%2)*.1,10);
plant(house,6.65,.02,-.62);plant(house,1.7,.02,2.0);

// Watering can and plant food sit outside, beside the flower beds.
const watering=interact('water','Watering can',9.2,3.9,[.75,.9,.75]);sphere(watering,M.green,.34,.32,.3,0,.31,0,16);torus(watering,M.green,.21,.045,0,.36,-.02,Math.PI/2,0,0,16);cylinder(watering,M.blue,.28,.04,.22,0,.52,0,16);cylinder(watering,M.green,.1,.13,.3,.2,.5,0,12);const canSpout=cylinder(watering,M.green,.07,.1,.35,.38,.52,0,12);canSpout.rotation.z=-.65;cylinder(watering,M.gold,.12,.12,.035,.55,.63,0,14);for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(watering,M.dark,.012,.012,.012,.55+Math.cos(a)*.07,.63+Math.sin(a)*.07,.025,6);}
const plantFood=interact('fertilize','Plant food',12.4,3.9,[.8,1.0,.8]);cylinder(plantFood,M.rose,.23,.28,.58,0,.3,0,16);cylinder(plantFood,M.gold,.25,.23,.08,0,.62,0,16);cylinder(plantFood,M.cream,.18,.18,.07,0,.71,0,12);box(plantFood,M.white,.18,.2,.035,0,.34,.27);box(plantFood,M.green,.09,.1,.015,0,.36,.29);sphere(plantFood,M.gold,.035,.035,.02,0,.42,.29,8);

// Windows sit flush with the outside walls instead of floating across room dividers.
function windowFrame(x,z,width=1.3,axis='z'){
  const g=new THREE.Group();house.add(g);const alongZ=axis==='z';
  const frameSize=alongZ?[.13,.9,width]:[width,.9,.13],glassSize=alongZ?[.055,.72,width-.16]:[width-.16,.72,.055];
  box(g,M.woodDark,...frameSize,x,1.5,z);box(g,M.glass,...glassSize,x+(alongZ?.085:0),1.5,z+(alongZ?0:.085));
  if(alongZ){box(g,M.white,.06,.74,.035,x+.12,1.5,z);box(g,M.white,.06,.035,width-.16,x+.12,1.5,z);}
  else{box(g,M.white,.035,.74,.06,x,1.5,z+.12);box(g,M.white,width-.16,.035,.06,x,1.5,z+.12);}
}
windowFrame(-7.9,-2.45,1.55,'z');windowFrame(-7.9,2.45,1.4,'z');windowFrame(-.8,4.9,1.35,'x');
for(const [x,z] of [[-3.7,-4.0],[-2.4,1.55],[6.65,-3.15]])plant(house,x,.02,z,false);

// The couple, Mochi and the tiny vacuum are proper little 3D figures.
function heldProp(parent,kind){
  const g=new THREE.Group();g.visible=false;parent.add(g);
  if(kind==='cup'){cylinder(g,M.white,.09,.08,.18,0,.04,0,14);torus(g,M.white,.065,.018,.09,.04,0,0,0,0,14);cylinder(g,M.choc,.068,.068,.012,0,.137,0,14);}
  if(kind==='book'){box(g,M.red,.23,.055,.18,0,.02,0);box(g,M.white,.205,.045,.17,0,.023,.015);box(g,M.gold,.025,.058,.18,-.105,.02,0);detailLine(g,M.gold,.1,.008,.012,0,.055,-.04);}
  if(kind==='toothbrush'){cylinder(g,M.rose,.025,.03,.3,0,0,0,10);box(g,M.white,.055,.1,.045,0,.18,0);for(let i=0;i<4;i++)sphere(g,M.green,.009,.02,.009,-.018+i*.012,.23,0,6);}
  if(kind==='plate'){cylinder(g,M.white,.14,.17,.035,0,.02,0,16);torus(g,M.gold,.12,.01,0,.04,0,0,0,0,18);sphere(g,M.fruit,.045,.035,.04,0,.055,0,8);}
  if(kind==='spoon'){rod(g,M.woodDark,.018,[0,-.12,0],[0,.14,0],8);sphere(g,M.metal,.045,.07,.035,0,.2,0,10);}
  if(kind==='bag'){box(g,M.rose,.18,.14,.09,0,.01,0);torus(g,M.woodDark,.065,.014,0,.12,0,0,0,0,14);box(g,M.gold,.07,.035,.012,0,.015,.052);}
  if(kind==='snack'){
    const make=()=>{const v=new THREE.Group();v.visible=false;g.add(v);return v;};const apple=make();sphere(apple,M.fruit,.095,.09,.09,0,.03,0,12);sphere(apple,M.green,.025,.025,.025,.025,.12,0,8);
    const chocolate=make();box(chocolate,M.choc,.16,.09,.11,0,.02,0);box(chocolate,M.gold,.17,.018,.12,0,.06,0);detailLine(chocolate,M.rose,.035,.012,.012,0,.075,.055);
    const cheese=make();box(cheese,M.gold,.17,.09,.13,0,.02,0);for(const x of [-.04,.03])sphere(cheese,M.cream,.018,.018,.018,x,.03,.07,7);
    const cucumber=make();const cucumberBody=cylinder(cucumber,M.green,.055,.06,.22,0,.02,0,12);cucumberBody.rotation.z=Math.PI/2;for(let i=0;i<3;i++)sphere(cucumber,M.leaf,.012,.012,.012,-.06+i*.06,.07,.045,6);
    const meat=make();sphere(meat,M.red,.1,.09,.075,0,.03,0,12);rod(meat,M.white,.025,[.07,.02,0],[.18,.02,0],8);for(const x of [.15,.2])sphere(meat,M.white,.035,.025,.025,x,.02,0,8);
    const vegetables=make();for(let i=0;i<4;i++){const leaf=sphere(vegetables,[M.green,M.leaf,M.sage][i%3],.07,.11,.04,(i-1.5)*.045,.04,0,10);leaf.rotation.z=(i-1.5)*.24;}
    const candy=make();sphere(candy,M.rose,.075,.07,.07,0,.02,0,12);cone(candy,M.gold,.045,.08,-.11,.02,0,8).rotation.z=Math.PI/2;cone(candy,M.gold,.045,.08,.11,.02,0,8).rotation.z=-Math.PI/2;
    g.userData.snackVariants={apple,chocolate,cheese,cucumber,meat,vegetables,candy};
  }
  if(kind==='water-can'){sphere(g,M.green,.13,.12,.12,0,.06,0,12);torus(g,M.green,.075,.018,0,.1,-.01,Math.PI/2,0,0,12);rod(g,M.green,.025,[.06,.04,.03],[.19,.08,.03],8);}
  if(kind==='plant-food'){cylinder(g,M.rose,.09,.11,.18,0,.02,0,12);cylinder(g,M.gold,.095,.09,.035,0,.12,0,12);box(g,M.white,.1,.055,.012,0,.02,.1);}
  if(kind==='controller'){box(g,M.dark,.22,.06,.13,0,.01,0);sphere(g,M.white,.035,.025,.025,-.06,.04,.025,8);for(let i=0;i<4;i++)sphere(g,[M.rose,M.gold,M.blue,M.green][i],.013,.013,.013,.055+(i%2)*.025,.04,(i<2?-.015:.025),6);}
  if(kind==='teddy'){sphere(g,M.wood,.13,.14,.12,0,.02,0,12);sphere(g,M.wood,.12,.12,.11,0,.21,0,12);for(const x of [-.08,.08]){sphere(g,M.wood,.05,.055,.05,x,.31,0,8);sphere(g,M.dark,.014,.018,.012,x,.22,.09,6);}sphere(g,M.dark,.016,.018,.014,0,.19,.1,6);}
  if(kind==='swan'){sphere(g,M.white,.16,.1,.13,-.02,.02,0,12);sphere(g,M.white,.055,.16,.06,.08,.17,0,10);sphere(g,M.white,.09,.07,.065,.13,.3,0,10);cone(g,M.gold,.03,.08,.2,.3,0,8).rotation.z=-Math.PI/2;}
  return g;
}
function setHeldProps(walker,action,detail={}){if(!walker?.heldProps)return;for(const pair of Object.values(walker.heldProps))pair.forEach(p=>p.visible=false);const choice=(detail.title||'').toLowerCase(),aliases={coffee:'cup','drink-water':'cup',eat:'snack',feed:'snack',fridge:'snack',treats:'snack',read:'book','brush-teeth':'toothbrush',water:'water-can',fertilize:'plant-food',game:'controller',dishes:'plate',cook:'spoon',bags:'bag','hug-bear':'teddy','hug-swan':'swan'};let kind=aliases[action];if(action==='fridge'&&(choice.includes('juice')||choice.includes('wine')))kind='cup';const selected=walker.heldProps[kind];if(selected){for(const prop of selected){prop.visible=true;if(kind==='snack'){const variants=prop.userData.snackVariants||{},choiceKey=choice.includes('chocolate')?'chocolate':choice.includes('cheese')?'cheese':choice.includes('cucumber')?'cucumber':choice.includes('meat')?'meat':choice.includes('vegetable')?'vegetables':choice.includes('candy')?'candy':'apple';for(const [name,variant] of Object.entries(variants))variant.visible=name===choiceKey;}if(kind==='cup'){const liquid=prop.children.find(o=>o.geometry?.type==='CylinderGeometry'&&Math.abs(o.position.y-.137)<.01);if(liquid)liquid.material=choice.includes('juice')?M.fruit:choice.includes('wine')?M.red:action==='coffee'?M.choc:M.blue;}}}}
function person(name,skin,hair,clothes,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);g.userData={actor:name,name:name==='him'?'You':'Your love'};house.add(g);clickable.push(g);actorGroups.push(g);
  const rig=new THREE.Group();g.add(rig);
  const outfit=mat(clothes),shirt=cylinder(rig,outfit,.28,.23,.63,0,.75,0,18);shirt.userData.clothing=true;const collar=torus(rig,M.white,.12,.025,0,1.04,.01,Math.PI/2,0,0,16);box(rig,M.white,.055,.5,.018,0,.77,.235);for(let i=0;i<3;i++)sphere(rig,M.gold,.018,.018,.018,0,.88-i*.13,.25,6);
  const arms=[],legs=[];
  for(const dx of [-1,1]){const arm=new THREE.Group();arm.position.set(dx*.29,.96,0);rig.add(arm);cylinder(arm,outfit,.09,.12,.42,0,-.2,0,12);torus(arm,M.cream,.075,.012,0,-.36,.01,Math.PI/2,0,0,12);sphere(arm,mat(skin),.1,.1,.1,0,-.43,.02,12);arms.push(arm);}
  for(const dx of [-1,1]){const leg=new THREE.Group();leg.position.set(dx*.14,.39,0);rig.add(leg);cylinder(leg,mat('#6a5146'),.095,.12,.43,0,-.18,0,12);cylinder(leg,M.cream,.1,.1,.055,0,-.12,.01,10);box(leg,M.woodDark,.2,.1,.31,0,-.39,.07);box(leg,M.dark,.19,.035,.08,0,-.43,.2);legs.push(leg);}
  const head=new THREE.Group();head.position.set(0,1.28,0);rig.add(head);cylinder(head,mat(skin),.13,.16,.18,0,-.23,0,16);sphere(head,mat(skin),.26,.3,.24,0,0,0,20);sphere(head,mat(hair),.27,.17,.25,0,.19,-.015,20);sphere(head,mat(hair),.13,.25,.24,-.19,.07,.08,16);sphere(head,mat(hair),.12,.22,.22,.18,.09,.06,14);
  for(const dx of [-.09,.09]){sphere(head,M.white,.036,.04,.018,dx,.03,.214,10);sphere(head,M.dark,.016,.023,.012,dx,.03,.231,8);sphere(head,M.dark,.02,.015,.015,dx,.105,.21,8);}sphere(head,mat(skin),.025,.025,.02,0,-.045,.235,8);detailLine(head,M.rose,.07,.012,.01,0,-.12,.23);
  const hit=new THREE.Mesh(new THREE.CapsuleGeometry(.56,.9,4,10),new THREE.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false}));hit.position.y=.9;g.add(hit);
  const heldProps={cup:[],book:[],toothbrush:[],snack:[],plate:[],spoon:[],bag:[],'water-can':[],'plant-food':[],controller:[],teddy:[],swan:[]};
  for(const arm of arms){const mount=new THREE.Group();mount.position.set(0,-.48,.04);arm.add(mount);for(const kind of Object.keys(heldProps)){const prop=heldProp(mount,kind);if(kind==='controller'||arm===arms[1])heldProps[kind].push(prop);}}
  const walker={group:g,rig,head,arms,legs,heldProps,speed:2.7,path:[],actor:true,actorName:name,pose:'idle',walkPhase:0};walkers.push(walker);return g;
}
const him=person('him','#efc7a7','#2c2928','#b4c5c6',-5.45,3.55);
const her=person('her','#f1c9a8','#3d2d28','#d9a9a5',-.95,1.95);
const dog=new THREE.Group();dog.position.set(6.85,0,2.55);dog.userData={action:'pet',name:'Mochi the husky'};house.add(dog);clickable.push(dog);const dogWalker={group:dog,speed:2.0,path:[],animal:true,pose:'idle',walkPhase:0};walkers.push(dogWalker);
const dogBody=sphere(dog,mat('#858b8e'),.57,.36,.37,0,.5,0,20);sphere(dog,M.white,.37,.18,.31,-.02,.72,.04,16);const dogHead=new THREE.Group();dogHead.position.set(.31,.58,0);dog.add(dogHead);sphere(dogHead,M.white,.33,.29,.38,.08,.14,.02,18);sphere(dogHead,mat('#70777b'),.32,.24,.34,.11,.24,-.03,18);sphere(dogHead,M.white,.22,.18,.29,.15,.12,.23,18);sphere(dogHead,M.white,.14,.1,.14,.2,.06,.42,12);sphere(dogHead,M.rose,.07,.035,.02,.2,-.03,.54,10);
for(const x of [-.13,.33]){const ear=cone(dogHead,mat('#73797c'),.16,.4,x,.52,-.05,12);ear.rotation.z=x<0?.18:-.18;}
for(const x of [-.01,.27]){sphere(dogHead,M.white,.055,.065,.025,x,.3,.31,10);sphere(dogHead,M.dark,.027,.035,.016,x,.3,.335,8);sphere(dogHead,M.dark,.042,.025,.022,x,.39,.3,8);}
const dogLegs=[];for(const x of [-.38,.34])for(const z of [-.22,.22]){const leg=new THREE.Group();leg.position.set(x,.38,z);dog.add(leg);cylinder(leg,M.white,.09,.1,.34,0,-.14,0,12);sphere(leg,M.white,.12,.075,.13,0,-.31,.04,10);for(let toe=-1;toe<=1;toe++)detailLine(leg,M.dark,.01,.012,.06,toe*.045,-.32,.16);dogLegs.push(leg);}
torus(dog,M.rose,.2,.045,.27,.58,0,Math.PI/2,0,0,18);sphere(dog,M.gold,.07,.07,.035,.45,.4,.14,12);sphere(dog,M.rose,.03,.03,.018,.45,.4,.18,8);dogWalker.head=dogHead;dogWalker.legs=dogLegs;
const tailPivot=new THREE.Group();tailPivot.position.set(-.48,.72,-.08);dog.add(tailPivot);const tail=sphere(tailPivot,M.white,.12,.4,.12,-.07,.22,0,14);tail.rotation.z=-.35;dogWalker.tail=tailPivot;
const robot=new THREE.Group();robot.position.set(6.45,0,-3.1);house.add(robot);walkers.push({group:robot,speed:1.3,path:[],cleaner:true});cylinder(robot,mat('#d0cbbf'),.35,.35,.18,0,.16,0,24);cylinder(robot,M.metal,.23,.23,.045,0,.27,0,24);torus(robot,M.cream,.32,.025,0,.2,0,0,0,0,24);sphere(robot,M.blue,.045,.025,.04,.15,.27,.16,10);for(const x of [-.12,.12])sphere(robot,M.dark,.025,.018,.018,x,.28,.18,8);box(robot,M.white,.32,.04,.12,0,.08,.25);for(const x of [-.24,.24]){cylinder(robot,M.dark,.055,.055,.045,x,.13,.09,10);rod(robot,M.dark,.012,[x,.12,.1],[x*1.25,.02,.16],8);}
const heartMat=new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=96;c.height=96;const x=c.getContext('2d');x.fillStyle='#e99594';x.font='74px Arial';x.textAlign='center';x.fillText('♥',48,72);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})(),transparent:true});

// Grid-based routes keep the people and Mochi out of furniture and open doorways.
const NAV={minX:-7.8,maxX:13.0,minZ:-4.8,maxZ:4.8,step:.35};
const toCell=(x,z)=>({ix:Math.round((x-NAV.minX)/NAV.step),iz:Math.round((z-NAV.minZ)/NAV.step)});
const toWorld=(ix,iz)=>({x:NAV.minX+ix*NAV.step,z:NAV.minZ+iz*NAV.step});
const maxIX=Math.round((NAV.maxX-NAV.minX)/NAV.step),maxIZ=Math.round((NAV.maxZ-NAV.minZ)/NAV.step);
function blocked(x,z,clearance=.1,ignore=null){if(x<NAV.minX+clearance||x>NAV.maxX-clearance||z<NAV.minZ+clearance||z>NAV.maxZ-clearance)return true;return solidZones.some(a=>a.owner!==ignore&&Math.abs(x-a.x)<a.rx+.09+clearance&&Math.abs(z-a.z)<a.rz+.09+clearance);}
function findPath(start,target,clearance=.16){
  const startCell=toCell(start.x,start.z),targetCell=toCell(target.x,target.z);let best=null;
  for(let ring=0;ring<10&&!best;ring++)for(let dx=-ring;dx<=ring;dx++)for(let dz=-ring;dz<=ring;dz++){
    if(Math.max(Math.abs(dx),Math.abs(dz))!==ring)continue;const ix=targetCell.ix+dx,iz=targetCell.iz+dz,p=toWorld(ix,iz);if(ix<0||ix>maxIX||iz<0||iz>maxIZ||blocked(p.x,p.z,clearance))continue;
    if(!best||Math.hypot(p.x-target.x,p.z-target.z)<Math.hypot(best.x-target.x,best.z-target.z))best=p;
  }
  if(!best)return[];
  const goal=toCell(best.x,best.z),startKey=`${startCell.ix},${startCell.iz}`,goalKey=`${goal.ix},${goal.iz}`;
  const open=[{ix:startCell.ix,iz:startCell.iz,key:startKey}],came=new Map(),g=new Map([[startKey,0]]),f=new Map([[startKey,Math.hypot(startCell.ix-goal.ix,startCell.iz-goal.iz)]]),closed=new Set();
  while(open.length){open.sort((a,b)=>(f.get(a.key)??Infinity)-(f.get(b.key)??Infinity));const cur=open.shift();if(cur.key===goalKey){const path=[];let key=goalKey;while(key!==startKey){const [ix,iz]=key.split(',').map(Number);path.unshift(toWorld(ix,iz));key=came.get(key);if(!key)break;}return path;}
    if(closed.has(cur.key))continue;closed.add(cur.key);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const ix=cur.ix+dx,iz=cur.iz+dz;if(ix<0||ix>maxIX||iz<0||iz>maxIZ)continue;const p=toWorld(ix,iz);if(blocked(p.x,p.z,clearance))continue;if(dx&&dz&&(blocked(toWorld(cur.ix+dx,cur.iz).x,toWorld(cur.ix+dx,cur.iz).z,clearance)||blocked(toWorld(cur.ix,cur.iz+dz).x,toWorld(cur.ix,cur.iz+dz).z,clearance)))continue;const key=`${ix},${iz}`,cost=(g.get(cur.key)??0)+(dx&&dz?1.414:1);if(cost>=(g.get(key)??Infinity))continue;came.set(key,cur.key);g.set(key,cost);f.set(key,cost+Math.hypot(ix-goal.ix,iz-goal.iz));open.push({ix,iz,key});}
  }
  return[];
}
function setWalk(walker,path,onComplete){walker.path=path;walker.pathIndex=0;walker.onPathComplete=onComplete||null;if(!path.length&&onComplete)onComplete(true);}
function walkTo(walker,x,z,onComplete){const start={x:walker.group.position.x,z:walker.group.position.z},clearance=walker.animal?.22:.16,path=findPath(start,{x,z},clearance);if(!path.length&&Math.hypot(start.x-x,start.z-z)>.55){onComplete?.(false);return false;}setWalk(walker,path,onComplete);return true;}
function roam(walker){
  const zones=walker.animal?[[6.7,-.55],[6.35,-3.0],[6.85,2.55],[7.35,3.05]]:walker.cleaner?[[6.45,-3.1],[6.75,-1.8],[6.85,2.55],[7.35,2.9]]:walker.actorName==='him'?[[-5.45,3.55],[-4.25,2.0],[-6.75,3.35],[-5.7,1.55]]:[[-.95,1.95],[-.3,3.45],[-2.45,2.4],[-1.85,4.0]];
  const p=zones[Math.floor(Math.random()*zones.length)];walkTo(walker,p[0],p[1]);
}
function routeTargets(action){
  const mapped=['tv','game','rest'].includes(action)?'rest':action;
  if(action==='work')return (actionGroups.get('work')||[]).filter(g=>g.userData.name==='Desk chair');
  return actionGroups.get(mapped)||[];
}
function activityPlans(action,target){
  const x=target.position.x,z=target.position.z;
  if(action==='hug-swan')return [{nav:{x:-3.72,z},pose:{x:-3.62,z,y:.035,rotation:-Math.PI/2,kind:'stand'}}];
  if(action==='hug-bear')return [{nav:{x,z:-3.9},pose:{x,z:-3.85,y:.035,rotation:0,kind:'stand'}}];
  if(['rest','tv','game'].includes(action))return [{nav:{x:x+target.userData.size[0]/2+.32,z},pose:{x,z,y:.53,rotation:Math.PI,kind:'sit'}}];
  if(action==='work'){
    const desk=(actionGroups.get('work')||[]).find(g=>g.userData.name==='Computer desk');
    return [{nav:{x:x+.68,z},pose:{x,z,y:.6,rotation:desk?Math.atan2(desk.position.x-x,desk.position.z-z):Math.PI,kind:'sit'}}];
  }
  if(action==='clothes')return [{nav:{x,z:z+.95},pose:{x,z:z+.72,y:.035,rotation:Math.PI,kind:'stand'}}];
  if(action==='mirror')return [{nav:{x:x-.85,z:z-.35},pose:{x:x-.62,z:z-.3,y:.035,rotation:Math.atan2(.62,.3),kind:'stand'}}];
  if(action==='makeup'||action==='skincare')return [{nav:{x,z:z+.94},pose:{x,z:z+.7,y:.28,rotation:Math.PI,kind:'sit'}}];
  if(action==='toilet')return [{nav:{x,z:z-.8},pose:{x,z:z-.08,y:.32,rotation:0,kind:'sit'}}];
  if(action==='sleep')return [{nav:{x,z:z+1.38},pose:{x,z,y:.7,rotation:0,kind:'sleep'}}];
  if(action==='bath')return [{nav:{x,z:z+1.0},pose:{x,z,y:.42,rotation:0,kind:'sit'}}];
  if(action==='shower')return [{nav:{x,z:z+.94},pose:{x,z:z+.82,y:.035,rotation:Math.PI,kind:'stand'}}];
  if(action==='fridge')return [{nav:{x,z:z-.95},pose:{x,z:z-.75,y:.035,rotation:0,kind:'stand'}}];
  if(action==='wash-hands'||action==='dishes')return [{nav:{x,z:z+target.userData.size[2]/2+.35},pose:{x,z:z+target.userData.size[2]/2+.17,y:.035,rotation:Math.PI,kind:'stand'}}];
  if(action==='eat'){
    const chairs=[[-1.4,0],[1.4,0]];
    return chairs.flatMap(([dx,dz])=>{const px=x+dx,pz=z+dz;return [
      {x:px+Math.sign(dx)*.72,z:pz},{x:px,z:pz+.95},{x:px,z:pz-.95},{x:px+Math.sign(dx)*.72,z:pz+.95}
    ].map(nav=>({nav,pose:{x:px,z:pz,y:.43,rotation:Math.atan2(x-px,z-pz),kind:'sit'}}));});
  }
  const halfX=Math.max(target.userData.size[0]/2,.36),halfZ=Math.max(target.userData.size[2]/2,.36),gap=.34;
  return [
    {nav:{x:x+halfX+gap,z},face:{x,z}},
    {nav:{x:x-halfX-gap,z},face:{x,z}},
    {nav:{x,z:z+halfZ+gap},face:{x,z}},
    {nav:{x,z:z-halfZ-gap},face:{x,z}}
  ].map(plan=>({...plan,pose:{x:plan.nav.x,z:plan.nav.z,y:.035,rotation:Math.atan2(plan.face.x-plan.nav.x,plan.face.z-plan.nav.z),kind:'stand'}}));
}
function choosePlan(walker,action,targets){
  const start={x:walker.group.position.x,z:walker.group.position.z};let best=null;
  const clearance=walker.animal?.22:.16;for(const target of targets)for(const plan of activityPlans(action,target)){
    if(blocked(plan.nav.x,plan.nav.z,clearance))continue;const path=findPath(start,plan.nav,clearance);if(!path.length&&Math.hypot(start.x-plan.nav.x,start.z-plan.nav.z)>.55)continue;
    const cost=path.length+Math.hypot(start.x-plan.nav.x,start.z-plan.nav.z)*.1;if(!best||cost<best.cost)best={...plan,target,path,cost};
  }
  return best;
}
let doorOpen=false;
window.cozyResetView=()=>controls.reset();
window.cozyToggleDoor=()=>{doorOpen=!doorOpen;const door=actionGroups.get('door')?.[0];if(door)door.rotation.y=doorOpen?-.95:0;const zone=solidZones.findIndex(z=>z.owner===door);if(doorOpen&&zone>=0)solidZones.splice(zone,1);else if(!doorOpen&&zone<0&&door)markSolid(door.position.x,door.position.z,.42,1.28,door);message.textContent=doorOpen?'Garden doors open — fresh air!':'Garden doors closed — snug again';setTimeout(()=>{message.textContent='Click an object to explore';},2500);};

const progressElement=document.createElement('div');progressElement.className='activity-progress';progressElement.innerHTML='<div class="activity-progress-label"><span></span><b>5s</b></div><div class="activity-progress-track"><i></i></div>';frame.appendChild(progressElement);
const progressLabel=progressElement.querySelector('span'),progressTime=progressElement.querySelector('b'),progressFill=progressElement.querySelector('i');
let activeActivity=null;
const actionEmoji={sleep:'💤',rest:'♡',tv:'📺',game:'🎮',work:'⌨',makeup:'✿',skincare:'✿',eat:'🍳',read:'📖',water:'💧',fertilize:'✦','drink-water':'💧',coffee:'☕',cook:'🍳','brush-teeth':'🪥',shower:'🚿',bath:'🛁',laundry:'🫧',dishes:'🫧',feed:'🥣',pet:'🐕',fridge:'🍎',treats:'🍬',photo:'♡',clothes:'✿',mirror:'♡',toilet:'♡','water-play':'💦'};
Object.assign(actionEmoji,{lamp:'💡',bags:'👜',figures:'🤖'});
function placeProgress(activity,now){
  if(!activity)return;const elapsed=now-activity.startedAt,ratio=Math.min(1,elapsed/activity.duration),remaining=Math.max(0,Math.ceil((activity.duration-elapsed)/1000));
  progressFill.style.width=`${ratio*100}%`;progressTime.textContent=`${remaining}s`;
  const point=new THREE.Vector3(activity.walker.group.position.x,activity.walker.group.position.y+2.02,activity.walker.group.position.z).project(camera),rect=frame.getBoundingClientRect();
  progressElement.style.left=`${(point.x+1)*rect.width/2}px`;progressElement.style.top=`${(1-point.y)*rect.height/2}px`;
}
function beginActivityPose(walker,action,plan,duration,autoCloseDoor,detail,resolve){
  const group=walker.group;walker.activityAction=action;walker.activityTarget=plan.target;walker.pose=walker.animal&&action==='feed'?'eat':plan.pose.kind;walker.walkPhase=0;
  group.position.set(plan.pose.x,plan.pose.y,plan.pose.z);group.rotation.y=plan.pose.rotation;
  if(walker.rig){walker.rig.position.set(0,plan.pose.kind==='sit'?.02:0,0);walker.rig.rotation.set(0,0,0);}
  setHeldProps(walker,action,detail);window.cozySceneEffect?.(action,walker,detail);
  const activity={walker,action,duration,startedAt:performance.now(),exit:{x:plan.nav.x,z:plan.nav.z,rotation:plan.pose.rotation},autoCloseDoor,resolve,finished:false,watchdog:null};
  activeActivity=activity;activity.watchdog=setTimeout(()=>finishActivity(activity,true),duration+1800);
  progressLabel.textContent=`${actionEmoji[action]||'♡'} ${plan.target.userData.name}`;progressElement.classList.add('visible');
}
function finishActivity(activity,ok){
  if(!activity||activity.finished)return;activity.finished=true;if(activity.watchdog)clearTimeout(activity.watchdog);
  if(activeActivity===activity)activeActivity=null;progressElement.classList.remove('visible');
  const w=activity.walker;w.path=[];w.onPathComplete=null;window.cozyFinishActivity?.(activity.action);setHeldProps(w,null);w.activityAction=null;w.activityTarget=null;w.effectKind=null;w.pose='idle';w.taskBusy=false;
  w.group.userData.spinUntil=0;delete w.group.userData.spinState;
  if(activity.exit){w.group.position.set(activity.exit.x,.035,activity.exit.z);w.group.rotation.set(0,activity.exit.rotation||0,0);}
  if(w.rig){w.rig.position.set(0,0,0);w.rig.rotation.set(0,0,0);w.arms.forEach(a=>a.rotation.set(0,0,0));w.legs?.forEach(l=>l.rotation.set(0,0,0));w.head?.rotation.set(0,0,0);}
  if(w.animal){w.group.rotation.x=0;dogBody.position.y=.5;}
  if(activity.autoCloseDoor&&doorOpen)window.cozyToggleDoor?.();activity.resolve({ok});
}
function startActivity(action,actorId,duration,detail={}){
  if(activeActivity)return Promise.resolve({ok:false});
  const walker=action==='feed'||action==='pet'?dogWalker:walkers.find(w=>w.group===(actorId==='her'?her:him));
  const targets=action==='pet'?[actorId==='her'?her:him]:routeTargets(action);if(!walker||walker.taskBusy||!targets.length)return Promise.resolve({ok:false});
  const target=targets.length===1?targets[0]:targets[Math.floor(Math.random()*targets.length)];
  const crossesGardenDoor=(walker.group.position.x>8)!==(target.position.x>8),autoDoor=crossesGardenDoor&&!doorOpen,closeDoorAfter=autoDoor;if(autoDoor)window.cozyToggleDoor?.();
  let plan;
  if(action==='pet'){
    let best=null;const start={x:walker.group.position.x,z:walker.group.position.z};
    for(let i=0;i<16;i++){const a=i*Math.PI/8,nav={x:target.position.x+Math.cos(a)*.82,z:target.position.z+Math.sin(a)*.82};if(blocked(nav.x,nav.z,.22))continue;const path=findPath(start,nav,.22);if(!path.length&&Math.hypot(start.x-nav.x,start.z-nav.z)>.55)continue;const cost=path.length+Math.hypot(start.x-nav.x,start.z-nav.z)*.1;if(!best||cost<best.cost)best={nav,path,cost};}
    if(best)plan={...best,target:dog,pose:{x:best.nav.x,z:best.nav.z,y:.035,rotation:Math.atan2(target.position.x-best.nav.x,target.position.z-best.nav.z),kind:'sit'}};
  }else plan=choosePlan(walker,action,[target]);
  if(!plan){if(autoDoor)window.cozyToggleDoor?.();return Promise.resolve({ok:false});}
  walker.taskBusy=true;
  return new Promise(resolve=>{
    let resolved=false;const routeTimer=setTimeout(()=>{if(resolved)return;resolved=true;walker.path=[];walker.onPathComplete=null;walker.taskBusy=false;if(closeDoorAfter&&doorOpen)window.cozyToggleDoor?.();resolve({ok:false});},20000);
    const arrived=ok=>{if(resolved)return;resolved=true;clearTimeout(routeTimer);if(!ok){walker.taskBusy=false;if(closeDoorAfter&&doorOpen)window.cozyToggleDoor?.();resolve({ok:false});return;}beginActivityPose(walker,action,plan,duration,closeDoorAfter,detail,resolve);};
    if(!plan.path.length&&Math.hypot(walker.group.position.x-plan.nav.x,walker.group.position.z-plan.nav.z)<.55)arrived(true);
    else setWalk(walker,plan.path,arrived);
  });
}
window.cozyStartActivity=(action,actorId,duration,detail)=>startActivity(action,actorId,duration,detail);
function moveActor(action,actorId){const walker=walkers.find(w=>w.group===(actorId==='her'?her:him)),targets=routeTargets(action);if(!walker||!targets.length)return;const plan=choosePlan(walker,action,targets);if(plan)setWalk(walker,plan.path);}
window.cozyMoveActor=moveActor;

const sceneEffects=[];
function gardenParticles(action){
  const color=action==='water'?'#9edbe2':'#f4d47e',material=mat(color,.35),count=18;
  for(let i=0;i<count;i++){const x=9.3+Math.random()*3.0,z=-3.4+Math.random()*6.5,y=.5+Math.random()*1.15;const particle=sphere(world,material,.035,.055,.035,x,y,z,8);sceneEffects.push({mesh:particle,life:1.15,velocity:action==='water'?-.42:.26});}
  setTimeout(()=>material.dispose(),1500);
}
function activityParticles(action,walker){
  if(!walker)return;const target=walker.activityTarget,x=target?.position.x??walker.group.position.x,z=target?.position.z??walker.group.position.z;
  const showering=action==='shower',bathing=action==='bath',washing=['wash-hands','brush-teeth'].includes(action),cooking=action==='cook';
  for(let i=0;i<(cooking?2:3);i++){const px=cooking?6.8:showering?x+.22:x+(Math.random()-.5)*.42,pz=cooking?1.2:showering?z-.42:z+(Math.random()-.5)*.3,py=cooking?1.1:showering?1.9:bathing?.78:washing?1.0:1.45;const material=action==='bath'?M.foam:action==='cook'?M.foam:M.water;const particle=sphere(world,material,.025+Math.random()*.025,.035+Math.random()*.035,.025,px,py,pz,8);sceneEffects.push({mesh:particle,life:.6+Math.random()*.3,velocity:action==='bath'?.16:action==='cook'?.2:-.68});}
}
let nextGardenEmission=0,nextActivityEmission=0;
window.cozySceneEffect=(action,walker)=>{
  if(action==='pet'){const pop=new THREE.Sprite(heartMat);pop.scale.set(.65,.65,1);pop.position.set(dog.position.x,.0+2.05,dog.position.z);world.add(pop);setTimeout(()=>world.remove(pop),1200);dog.userData.tailWag=performance.now()+1000;return;}
  if(action==='tv'||action==='game'){for(const group of actionGroups.get('tv')||[]){const target=group.getObjectByName('tv-screen');if(target){target.material=action==='game'?M.gameScreen:M.tvScreen;group.userData.screenAction=action;}}}
  if(action==='water'||action==='fertilize')gardenParticles(action);
  if(action==='fridge'){for(const group of actionGroups.get('fridge')||[])group.userData.fridgeActive=true;}
  if(action==='water-play'||action==='wash-hands'||action==='brush-teeth'||action==='shower'||action==='bath'){if(walker)walker.effectKind=action;}
  if(action==='cook'){const g=actionGroups.get('cook')?.[0];if(g)g.userData.cooking=true;}
  if(action==='music'){const g=(actionGroups.get('music')||[])[0];if(g){g.userData.pulseUntil=performance.now()+650;}}
  if(action==='lamp'){const g=actionGroups.get('lamp')?.[0];if(g){g.userData.lit=!g.userData.lit;g.userData.light.intensity=g.userData.lit?1.25:0;g.userData.bulb.material.emissiveIntensity=g.userData.lit?0.8:0.05;}}
  if(action==='bags'||action==='figures'){const g=actionGroups.get(action)?.[0];if(g)g.userData.pulseUntil=performance.now()+1100;}
  if(action==='laundry'||action==='dishes'){const g=(actionGroups.get(action)||[])[0];if(g)g.userData.activeUntil=Infinity;if(action==='dishes'&&g)g.userData.dishwasherActive=true;}
  if(action==='mirror'&&walker)walker.group.userData.spinState={from:walker.group.rotation.y,startedAt:performance.now(),duration:900};
  if(action==='photo'){const g=(actionGroups.get('photo')||[])[0];if(g)g.userData.pulseUntil=performance.now()+700;}
  if(action==='clothes'){const g=walker?.group;let shirt=null;g?.traverse(o=>{if(o.userData.clothing)shirt=o;});if(shirt)shirt.userData.outfitTarget=new THREE.Color().setHSL(Math.random(),.35,.68);}
  if(action==='clothes'){const closet=actionGroups.get('clothes')?.[0];if(closet)closet.userData.closetActive=true;}
};
M.tvScreen=new THREE.MeshStandardMaterial({color:'#f6dfad',roughness:.22,emissive:'#f4ce81',emissiveIntensity:.48});M.gameScreen=new THREE.MeshStandardMaterial({color:'#8eb8b7',roughness:.2,emissive:'#579a9a',emissiveIntensity:.65});
window.cozyFinishActivity=action=>{
  if(action==='fridge')for(const group of actionGroups.get('fridge')||[])group.userData.fridgeActive=false;
  if(action==='tv'||action==='game')for(const group of actionGroups.get('tv')||[]){const target=group.getObjectByName('tv-screen');if(target)target.material=M.screen;group.userData.screenAction=null;}
  if(action==='cook'){const g=actionGroups.get('cook')?.[0];if(g)g.userData.cooking=false;}
  if(action==='clothes'){const g=actionGroups.get('clothes')?.[0];if(g)g.userData.closetActive=false;}
  if(action==='laundry'||action==='dishes'){const g=actionGroups.get(action)?.[0];if(g)g.userData.activeUntil=0;if(action==='dishes'&&g)g.userData.dishwasherActive=false;}
};

// Pointer clicks select a miniature or a character; right drag rotates the camera and left drag pans.
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
const selectionHalo=new THREE.Mesh(new THREE.TorusGeometry(.62,.025,6,36),new THREE.MeshBasicMaterial({color:'#d5a77c',transparent:true,opacity:.9,depthWrite:false}));selectionHalo.rotation.x=Math.PI/2;selectionHalo.position.y=.045;house.add(selectionHalo);
function updateSelectionHalo(){const selected=window.cozySelectedActor==='her'?her:him;selectionHalo.position.x=selected.position.x;selectionHalo.position.z=selected.position.z;}
function objectRoot(object){let current=object;while(current&&current!==house){if(current.userData.action||current.userData.actor)return current;current=current.parent;}return null;}
function setPointer(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);}
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,button:e.button};});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||down.button!==0||e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return;}down=null;setPointer(e);const actorHit=raycaster.intersectObjects(actorGroups,true)[0];const actorRoot=actorHit&&objectRoot(actorHit.object);if(actorRoot?.userData.actor){window.cozySelectedActor=actorRoot.userData.actor;updateSelectionHalo();window.cozySelectActor?.(actorRoot.userData.actor);return;}const hits=raycaster.intersectObjects(clickable,true);if(!hits.length)return;const root=objectRoot(hits[0].object);if(root?.userData.action){message.textContent=root.userData.name;window.cozyBeginAction?.(root.userData.action);setTimeout(()=>{message.textContent='Click an object to explore';},4000);}});
renderer.domElement.addEventListener('pointermove',e=>{if(down)return;setPointer(e);const actorHit=raycaster.intersectObjects(actorGroups,true)[0],hit=actorHit||raycaster.intersectObjects(clickable,true)[0],root=hit&&objectRoot(hit.object);renderer.domElement.style.cursor=root?'pointer':'grab';if(root)message.textContent=root.userData.name;});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
window.cozySelectedActor='him';updateSelectionHalo();

// Visitors and the robot vacuum stroll along an obstacle-aware path grid.
setInterval(()=>{for(const w of walkers)if(!w.taskBusy&&!w.activityAction&&!w.path?.length&&Math.random()>.25)roam(w);},3800);
let last=performance.now();
function resize(){const w=frame.clientWidth,h=frame.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;if(w<650){const direction=new THREE.Vector3(17,19,23).normalize();camera.position.copy(controls.target).addScaledVector(direction,43);}camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(frame);resize();
function animate(now){
  const dt=Math.min((now-last)/1000,.06);last=now;controls.update();updateSelectionHalo();
  for(const walker of walkers){
    const g=walker.group,moving=Boolean(walker.path?.length);
    if(moving){const p=walker.path[walker.pathIndex];if(!p)walker.path=[];else{const dx=p.x-g.position.x,dz=p.z-g.position.z,d=Math.hypot(dx,dz),step=walker.speed*dt;if(d<step+.04){g.position.x=p.x;g.position.z=p.z;walker.pathIndex++;if(walker.pathIndex>=walker.path.length){walker.path=[];const done=walker.onPathComplete;walker.onPathComplete=null;done?.(true);}}else{g.position.x+=dx/d*step;g.position.z+=dz/d*step;g.rotation.y=Math.atan2(dx,dz);}}}
    if(walker.actor){
      if(moving){walker.walkPhase+=dt*10;const swing=Math.sin(walker.walkPhase)*.42;walker.arms[0].rotation.x=swing;walker.arms[1].rotation.x=-swing;walker.legs[0].rotation.x=-swing;walker.legs[1].rotation.x=swing;g.position.y=.035+Math.abs(Math.sin(walker.walkPhase*2))*.035;}
      else{
        const action=walker.activityAction,sit=walker.pose==='sit';g.position.y=walker.activityAction?g.position.y:.035;walker.rig.position.y=sit?-.18:walker.pose==='sleep'?Math.sin(now*.003)*.012:0;walker.rig.rotation.z=walker.pose==='sleep'?Math.PI/2:0;
        walker.legs[0].rotation.x=sit?-1.28:0;walker.legs[1].rotation.x=sit?-1.28:0;
        let left=0,right=0;
        if(action==='work'){left=-.62+Math.sin(now*.012)*.06;right=-.62+Math.sin(now*.035)*.12;}
        else if(action==='makeup'||action==='skincare'){left=-.28+Math.sin(now*.008)*.08;right=-.9+Math.sin(now*.018)*.16;walker.head.rotation.z=Math.sin(now*.004)*.035;}
        else if(action==='cook'){left=-.48+Math.sin(now*.009)*.08;right=-.82+Math.sin(now*.02)*.2;}
        else if(action==='dishes'||action==='wash-hands'){left=-.48+Math.sin(now*.026)*.08;right=-.52-Math.sin(now*.026)*.08;}
        else if(action==='laundry'){left=-.28;right=-.62+Math.sin(now*.014)*.1;}
        else if(action==='read'){left=-.68+Math.sin(now*.006)*.04;right=-.68+Math.sin(now*.006)*.04;walker.head.rotation.x=-.05;}
        else if(['coffee','drink-water'].includes(action)){right=-.38-(.72+Math.sin(now*.006)*.1)*(.5+.5*Math.sin(now*.005));walker.head.rotation.x=-.06-Math.max(0,Math.sin(now*.005))*.08;}
        else if(['fridge','treats','eat','feed'].includes(action)){right=-.84+Math.sin(now*.012)*.18;walker.head.rotation.x=-.04-Math.max(0,Math.sin(now*.008))*.08;}
        else if(action==='water'||action==='fertilize'||action==='water-play'){right=-.58+Math.sin(now*.02)*.22;left=-.16;}
        else if(action==='brush-teeth'){right=-.88+Math.sin(now*.045)*.2;walker.head.rotation.x=.04;}
        else if(action==='shower'||action==='bath'){left=-.58+Math.sin(now*.012)*.2;right=-.62-Math.sin(now*.012)*.18;}
        else if(action==='game'){left=-.5+Math.sin(now*.026)*.1;right=-.5-Math.sin(now*.026)*.1;}
        else if(action==='bags'){right=-.72+Math.sin(now*.01)*.08;walker.head.rotation.x=-.06;}
        else if(action==='figures'){walker.head.rotation.x=-.08;}
        else if(action==='tv'){left=-.12+Math.sin(now*.006)*.025;right=-.12-Math.sin(now*.006)*.025;}
        else if(action==='hug-bear'||action==='hug-swan'){left=-.82+Math.sin(now*.01)*.05;right=-.82+Math.sin(now*.01)*.05;walker.arms[0].rotation.z=-.45;walker.arms[1].rotation.z=.45;}
        if(!['makeup','skincare','read','coffee','drink-water','fridge','treats','eat','feed','brush-teeth'].includes(action))walker.head.rotation.set(0,0,0);
        walker.arms[0].rotation.x=left;walker.arms[1].rotation.x=right;
        let outfit=null;walker.group.traverse(o=>{if(o.userData.outfitTarget)outfit=o;});if(outfit){outfit.material.color.lerp(outfit.userData.outfitTarget,dt*1.5);if(outfit.material.color.distanceTo(outfit.userData.outfitTarget)<.015)delete outfit.userData.outfitTarget;}
      }
    }
    else if(walker.animal){
      if(walker.pose==='eat'){dogBody.position.y=.5;g.position.y=.015;dogHead.rotation.x=.15+Math.sin(now*.014)*.12;walker.legs.forEach((leg,i)=>leg.rotation.x=i<2?.12:0);}
      else if(walker.pose==='sit'){dogBody.position.y=.38;g.position.y=.035;dogHead.rotation.x=-.12;walker.legs.forEach((leg,i)=>leg.rotation.x=i<2?-.42:.5);}
      else{dogBody.position.y=.5;dogHead.rotation.x=moving?Math.sin(now*.012)*.04:Math.sin(now*.002)*.02;walker.legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(walker.walkPhase+i*Math.PI)*.4:Math.sin(now*.003+i)*.025);if(moving)g.position.y=.025+Math.abs(Math.sin(now*.012))*.025;}
    }
    else if(walker.cleaner&&!moving){robot.rotation.y+=dt*.18;}
    const spin=g.userData.spinState;if(spin){const t=Math.min(1,(now-spin.startedAt)/spin.duration),ease=t*t*(3-2*t);g.rotation.y=spin.from+Math.PI*2*ease;if(t>=1){g.rotation.y=spin.from;delete g.userData.spinState;}}
  }
  tailPivot.rotation.z=dog.userData.tailWag>now?Math.sin(now*.045)*.8:Math.sin(now*.003)*.08;
  for(const group of [...(actionGroups.get('music')||[]),...(actionGroups.get('photo')||[]),...(actionGroups.get('bags')||[]),...(actionGroups.get('figures')||[])]){const pulse=group.userData.pulseUntil>now;group.scale.setScalar(pulse?1+Math.sin(now*.025)*.035:1);}
  for(const group of actionGroups.get('fridge')||[]){const doors=group.userData.fridgeDoors||[],open=group.userData.fridgeActive;doors.forEach((door,i)=>{const target=open?(i===0?1.12:-1.12):0;door.rotation.y=THREE.MathUtils.damp(door.rotation.y,target,7,dt);});}
  for(const group of actionGroups.get('clothes')||[]){const doors=group.userData.closetDoors||[],open=group.userData.closetActive;doors.forEach((door,i)=>{const target=open?(i===0?-.95:.95):0;door.rotation.y=THREE.MathUtils.damp(door.rotation.y,target,6,dt);});}
  for(const action of ['laundry','dishes'])for(const group of actionGroups.get(action)||[]){const active=group.userData.activeUntil>now;group.rotation.z=active?Math.sin(now*.045)*.018:0;if(action==='laundry'){const drum=group.children.find(o=>o.geometry?.type==='CylinderGeometry'&&Math.abs(o.position.y-.57)<.02);if(drum)drum.rotation.z+=active?dt*2:0;}if(action==='dishes'&&group.userData.door){const target=group.userData.dishwasherActive?-1.12:0;group.userData.door.rotation.x=THREE.MathUtils.damp(group.userData.door.rotation.x,target,6,dt);}}
  for(const group of actionGroups.get('cook')||[]){if(group.userData.cooking&&now>nextActivityEmission){activityParticles('cook',activeActivity?.walker);nextActivityEmission=now+350;}}
  for(let i=0;i<gardenBlooms.length;i++){const bloom=gardenBlooms[i];bloom.rotation.z=Math.sin(now*.0016+i)*.035;}
  if(activeActivity){const activity=activeActivity,action=activity.action,elapsed=now-activity.startedAt;if(['water','fertilize'].includes(action)&&now>nextGardenEmission){gardenParticles(action);nextGardenEmission=now+550;}if(['water-play','wash-hands','brush-teeth','shower','bath'].includes(action)&&now>nextActivityEmission){activityParticles(action,activity.walker);nextActivityEmission=now+180;}if(action==='dishes'&&elapsed>activity.duration*.55&&activity.walker.heldProps?.plate?.some(p=>p.visible))setHeldProps(activity.walker,null);placeProgress(activity,now);if(elapsed>=activity.duration)finishActivity(activity,true);}
  renderer.render(scene,camera);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
