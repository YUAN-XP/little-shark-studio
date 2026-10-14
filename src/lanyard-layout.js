// Fit the original lanyard joints and hardware to the existing DOM card.
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const CLIP_MODEL={minX:-0.069002144,maxX:0.06820666,top:1.229370117,clipBottom:1.118284702,clampTop:1.118333936,clampBottom:.932366848,cardJoin:.95,bandJoin:1.2};
export const BADGE_SLOT={top:12,height:10,width:28,anchorInset:16};

export function lanyardLayout({width,height,drop,stageWidth=1169,stageHeight=1400,cameraZ=20,fov=20}){
  const cardWidth=Math.max(1,width),cardHeight=Math.max(1,height),anchorDrop=Math.max(88,drop);
  const canvasHeight=anchorDrop+cardHeight+68;
  const unit=2*Math.tan(fov*Math.PI/360)*cameraZ/canvasHeight;
  const metalPx=clamp(cardWidth*.09,28,36)/(CLIP_MODEL.maxX-CLIP_MODEL.minX);
  const slotCenter=BADGE_SLOT.top+BADGE_SLOT.height/2;
  const hookRise=(CLIP_MODEL.top-CLIP_MODEL.cardJoin)*metalPx-slotCenter;
  // Original example: (joint y=1.5 - group y=-1.2) / scale=2.25.
  // Seat the band inside the ring at model y=1.2, rather than flush with its
  // outside top. Its angled end corners then stay within the same buckle.
  const bandRise=(CLIP_MODEL.bandJoin-CLIP_MODEL.cardJoin)*metalPx-slotCenter;
  const ropePixels=anchorDrop-bandRise;
  const anchorY=canvasHeight/2*unit,restY=(canvasHeight/2-anchorDrop-cardHeight/2)*unit;
  const ropeLength=ropePixels*unit,jointLength=ropeLength/3;
  return {cardWidth,cardHeight,drop:anchorDrop,unit,anchorY,restY,stageWidth,stageHeight,
    attachOffset:(cardHeight/2+hookRise)*unit,ropeLength,jointLength,
    bandOffset:(cardHeight/2+bandRise)*unit,
    visibleAnchorY:anchorY-BADGE_SLOT.anchorInset*unit,
    metalScale:metalPx*unit,metalOffset:(cardHeight/2-metalPx*CLIP_MODEL.cardJoin-slotCenter)*unit,
    slotCenter,clipHeight:(CLIP_MODEL.top-CLIP_MODEL.clipBottom)*metalPx,
    clampHeight:(CLIP_MODEL.clampTop-CLIP_MODEL.clampBottom)*metalPx};
}

export function assemblyClip(clipPath,{localTop,drop,height,stageHeight}){
  if(clipPath==='none')return 'none';
  const values=clipPath.match(/-?[\d.]+(?:%|px)/g)||[];
  const bottom=values[values.length<3?0:2]||'100%';
  const hidden=parseFloat(bottom)/(bottom.endsWith('%')?100:height);
  const progress=clamp(1-hidden,0,1),top=localTop-drop;
  return `inset(${Math.max(0,top)}px 0px ${Math.max(0,stageHeight-top-(drop+height)*progress)}px 0px)`;
}

export function pointerToCardPlane({clientX,clientY,left,top},layout){
  return{x:(clientX-left-layout.cardWidth/2)*layout.unit,y:layout.restY-(clientY-top-layout.cardHeight/2)*layout.unit,z:0};
}
export function poseToCss(p,q,layout){
  const angle=Math.atan2(2*q.z*q.w,1-2*q.z*q.z);
  return{x:p.x/layout.unit,y:-(p.y-layout.restY)/layout.unit,angle:-angle*180/Math.PI};
}
export function bodyToCss(body,layout){return poseToCss(body.translation(),body.rotation(),layout);}
