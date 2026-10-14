import React from 'react';
import {createRoot} from 'react-dom/client';
import ProjectGallery from '/src/ProjectGallery.jsx';
import {projects} from '/src/content.js';
import '/src/styles.css';
const sixth={...projects[0],id:'sixth-dev-only',number:'06',label:'第六项（测试）'};
const fixture=projects.length>=6 ? projects.slice(0,6) : [...projects,sixth];
createRoot(document.getElementById('root')).render(<main style={{padding:'70px 70px 60px'}}>
  <h1 style={{fontSize:20,marginBottom:40}}>六项目连续循环 · 开发检查</h1>
  <ProjectGallery items={fixture} onSelect={()=>{}} />
</main>);
