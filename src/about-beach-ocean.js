import * as THREE from 'three';

// The four channels come from the user's Ocean modifier, including its foam
// attribute. Quantization is only a transport format; samples stay linear.
export function decodeOceanSamples(meta, buffer) {
  if (meta.format !== 'blender-ocean-quant16-v1' || meta.grid < 2 || meta.frameCount < 2 || !(meta.loopSeconds > 0)) {
    throw new Error('Unsupported Blender ocean animation.');
  }
  const length = meta.grid * meta.grid * meta.frameCount * 4;
  if (buffer.byteLength !== length * 2) throw new Error('Incomplete Blender ocean samples.');
  const view = new DataView(buffer), samples = new Float32Array(length);
  for (let i = 0; i < length; i++) samples[i] = meta.minimum[i % 4] + view.getUint16(i * 2, true) / 65535 * meta.range[i % 4];
  return { meta, samples };
}

export async function loadOceanSamples(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ocean metadata: HTTP ${response.status}`);
  const meta = await response.json();
  const data = await fetch(new URL(meta.sampleFile, new URL(url, location.href)));
  if (!data.ok) throw new Error(`Ocean samples: HTTP ${data.status}`);
  return decodeOceanSamples(meta, await data.arrayBuffer());
}

export const islandCoastGLSL = `
float islandRadius(vec2 p){return length(p / vec2(21.,18.));}
float coastDetail(vec2 p){return sin(p.x*.33+p.y*.19)*.025+sin(p.y*.61-p.x*.21)*.015;}
float coastline(vec2 p){return islandRadius(p)+coastDetail(p);}
`;

export function createBlenderOcean({ meta, samples }, pigmentMap, time) {
  const texture = new THREE.DataTexture(samples, meta.grid, meta.grid * meta.frameCount, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  const palette = Object.fromEntries(Object.entries(meta.paletteLinear).map(([key, rgb]) => [key, { value: new THREE.Color().fromArray(rgb) }]));
  const material = new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: {
      ...palette, time, samples: { value: texture }, paint: { value: pigmentMap },
      grid: { value: meta.grid }, frames: { value: meta.frameCount }, period: { value: meta.loopSeconds },
      foamThreshold: { value: meta.sourceFoamThreshold },
    },
    vertexShader: `
      uniform sampler2D samples;
      uniform float time,grid,frames,period;
      varying vec3 vWorld,vNormal;
      varying float vFoam;
      ${islandCoastGLSL}
      vec4 oceanAt(vec2 p){
        vec2 uv=fract(p/65.+.5);
        float frame=mod(time,period)/period*(frames-1.);
        float a=floor(frame),b=min(a+1.,frames-1.);
        vec2 pixel=uv*(grid-1.)+.5;
        return mix(texture2D(samples,vec2(pixel.x/grid,(pixel.y+a*grid)/(grid*frames))),
                   texture2D(samples,vec2(pixel.x/grid,(pixel.y+b*grid)/(grid*frames))),fract(frame));
      }
      float heightAt(vec2 p){
        return oceanAt(p).z*.115*smoothstep(.65,1.25,coastline(p));
      }
      void main(){
        vec4 p=modelMatrix*vec4(position,1.);
        vec4 wave=oceanAt(p.xz);
        float coastal=smoothstep(.65,1.25,coastline(p.xz));
        p.xz+=wave.xy*.30*coastal;
        p.y+=wave.z*.115*coastal;
        float e=.38;
        vNormal=normalize(vec3(heightAt(p.xz-vec2(e,0.))-heightAt(p.xz+vec2(e,0.)),2.*e,
                              heightAt(p.xz-vec2(0.,e))-heightAt(p.xz+vec2(0.,e))));
        vWorld=p.xyz;vFoam=wave.w;
        gl_Position=projectionMatrix*viewMatrix*p;
      }
    `,
    fragmentShader: `
      uniform float time,foamThreshold;
      uniform vec3 ocean,foam,sunlight,sunset;
      uniform sampler2D paint;
      varying vec3 vWorld,vNormal;
      varying float vFoam;
      ${islandCoastGLSL}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float grain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){
        vec2 p=vWorld.xz;
        float coast=coastline(p);
        float wash=sin(time*.62+p.x*.028+p.y*.015)*.017;
        if(coast<.79+wash)discard;
        vec3 n=normalize(vNormal),light=normalize(vec3(-.24,.55,-.80));
        float shade=dot(n,light);
        vec3 c=ocean*mix(.68,1.,smoothstep(.24,.65,shade));
        float printGrain=grain(p*vec2(1.8,5.1));
        float strokes=texture2D(paint,p*.065).r;
        c*=.88+printGrain*.14+strokes*.07;
        float offshore=smoothstep(.87,1.45,coast);
        // Respect the source's graphic cyan foam and yellow/orange light bands.
        float crest=smoothstep(foamThreshold*.5,foamThreshold*1.5,vFoam);
        vec3 view=normalize(cameraPosition-vWorld);
        float reflection=dot(reflect(-light,n),view);
        float flecks=smoothstep(.45,.78,grain(p*vec2(.65,2.8)+vec2(0.,time*.02)));
        float ribbon=exp(-pow((p.x+.30*p.y+8.)/max(4.,abs(p.y)*.12),2.))*smoothstep(12.,50.,-p.y);
        float glow=max(smoothstep(.90,.98,reflection),ribbon*.30)*flecks;
        c=mix(c,sunlight,glow*.48*offshore);
        c=mix(c,sunset,smoothstep(.972,.996,reflection)*flecks*.26*offshore);
        float lace=(1.-smoothstep(.81+wash,.85+wash+printGrain*.03,coast));
        c=mix(c,foam,clamp(max(crest*.74*offshore,lace*.86),0.,.92));
        float mist=1.-exp(-max(0.,distance(cameraPosition,vWorld)-90.)*.008);
        c=mix(c,vec3(.38,.69,.84),mist*.46);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }
    `,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(440,440,240,240), material);
  sea.name = 'User_Blender_Ocean'; sea.rotation.x = -Math.PI/2; sea.position.y = -.48;
  sea.userData.source = meta.source;
  sea.userData.animation = 'Original Ocean modifier and foam samples';
  return { sea, texture };
}
