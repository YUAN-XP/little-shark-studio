// Invisible depth face: the metal really passes through a capsule-shaped slot.
export function badgeFaceGeometry(THREE,layout){
  const u=layout.unit,w=layout.cardWidth*u,h=layout.cardHeight*u,r=25*u;
  const face=new THREE.Shape();
  face.moveTo(-w/2+r,-h/2);face.lineTo(w/2-r,-h/2);face.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
  face.lineTo(w/2,h/2-r);face.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
  face.lineTo(-w/2+r,h/2);face.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
  face.lineTo(-w/2,-h/2+r);face.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const cy=h/2-layout.slotCenter*u,hw=14*u,hr=5*u,hole=new THREE.Path();
  hole.moveTo(-hw+hr,cy-hr);hole.lineTo(hw-hr,cy-hr);hole.absarc(hw-hr,cy,hr,-Math.PI/2,Math.PI/2,false);
  hole.lineTo(-hw+hr,cy+hr);hole.absarc(-hw+hr,cy,hr,Math.PI/2,Math.PI*1.5,false);hole.closePath();face.holes.push(hole);
  return new THREE.ShapeGeometry(face,16);
}
