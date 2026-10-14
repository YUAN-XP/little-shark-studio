// MeshLine's default clipping uses the strip centerline. Include its actual
// width in the view-space clip position, so diagonal edges stay below the tape.
export function clipRibbonEdges(shader){
  shader.vertexShader=shader.vertexShader.replace(
    'vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
    'vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n    mvPosition.xy += normal.xy * side / (vec2(projectionMatrix[0][0], projectionMatrix[1][1]) * aspect);'
  );
}
