import React from 'react';
import { createRoot } from 'react-dom/client';
import BorderGlow from '../src/BorderGlow.jsx';

const targetStyle = {position:'absolute',top:'50%',transform:'translateY(-50%)',padding:'8px',border:0,background:'transparent',color:'#fff1bc',cursor:'pointer'};
createRoot(document.getElementById('root')).render(<main style={{padding:60,background:'#245674',minHeight:'100vh',boxSizing:'border-box'}}>
  <h1 style={{font:'20px sans-serif',color:'#fff1bc',marginBottom:60}}>点击不同区域，检查真实鼠标位置产生的边缘光效</h1>
  <BorderGlow className="pointer-test" backgroundColor="transparent" borderRadius={90} glowColor="43 85 82" colors={['#ffe5a0','#c8e6f0','#a4d7df']} style={{width:700,height:180}}>
    <button style={{...targetStyle,left:2}} type="button">左侧边缘</button>
    <button style={{...targetStyle,left:'50%',transform:'translate(-50%,-50%)'}} type="button">中央区域</button>
    <button style={{...targetStyle,right:2}} type="button">右侧边缘</button>
  </BorderGlow>
</main>);
