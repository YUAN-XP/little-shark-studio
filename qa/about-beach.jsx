import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AboutBeach from '../src/AboutBeach.jsx';
import { studioNotes } from '../src/content.js';
import '../src/styles.css';
function Check() {
  const [hidden,setHidden]=useState(false);
  const reduced=new URLSearchParams(location.search).get('motion')==='reduced';
  return <><div style={{padding:12,display:'flex',gap:16}}>
    <button onClick={()=>setHidden(value=>!value)}>{hidden?'显示场景':'隐藏场景'}</button>
    <button onClick={()=>document.querySelector('.about-beach canvas')?.dispatchEvent(new Event('webglcontextlost',{cancelable:true}))}>模拟显卡上下文丢失</button>
    <span>{reduced?'减少动态':'正常动态'}</span>
  </div><section className="studio-about" style={{display:hidden?'none':'block'}}><AboutBeach notes={studioNotes} reducedMotion={reduced}/></section></>;
}
createRoot(document.getElementById('root')).render(<Check/>);
