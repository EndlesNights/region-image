const moduleID = `region-image`;

Hooks.once("init", function () {

    libWrapper.register(
        moduleID,
        'Region.prototype._draw',
        function (wrapped, options) {
            wrapped(options);
            const customImgFlag = this.document.getFlag(moduleID, "img");

            if (customImgFlag) {
                this.hasCustomImage = !!customImgFlag;
                this.customImageTexture = PIXI.Texture.from(customImgFlag);
            } else {
                this.hasCustomImage = false;
            }
        },
        `WRAPPER`
    );

    libWrapper.register(
        moduleID,
        'HighlightRegionShader.prototype._preRender',
        function (wrapped, mesh, renderer) {
            wrapped(mesh, renderer);
            if (mesh.region.hasCustomImage) {
                this.uniforms.hasCustomImage = mesh.region.hasCustomImage;
                this.uniforms.uTexture = mesh.region.customImageTexture;

                this.uniforms.canvasX = canvas.dimensions.width;
                this.uniforms.canvasY = canvas.dimensions.height;
                this.uniforms.canvasGrid = canvas.grid.size;
                this.uniforms.drawTerrianTint = mesh.region.drawTerrianTint;
            }
        },
        'WRAPPER'
    );

    foundry.canvas.rendering.shaders.HighlightRegionShader.defaultUniforms = {
        resolution: 1,
        hatchEnabled: false,
        hatchThickness: 1,
        canvasDimensions: [1, 1],

        alphaOffset: 1.0,
        drawTerrianTint: true,
        hasCustomImage: false,

        uTexture: null,
    };

    foundry.canvas.rendering.shaders.HighlightRegionShader.fragmentShader = `\
    precision ${PIXI.settings.PRECISION_FRAGMENT} float;

    varying float vHatchOffset;

    uniform vec4 tintAlpha;
    uniform float resolution;
    uniform bool hatchEnabled;
    uniform mediump float hatchThickness;


        uniform sampler2D uTexture;
        uniform vec2 canvasDimensions;
        uniform float canvasX;
        uniform float canvasY;
        uniform float canvasGrid;
        uniform float alphaOffset;

        uniform bool drawTerrianTint;
        uniform bool hasCustomImage;


        varying vec2 vCanvasCoord; // normalized canvas coordinates

    void main() {

      if(hasCustomImage){
            vec2 textureCoord = fract(vCanvasCoord * vec2(canvasX, canvasY) / canvasGrid);
            
            vec4 textureColor = texture2D(uTexture, textureCoord);
            textureColor.a *= alphaOffset;

            if(drawTerrianTint){
                gl_FragColor = (textureColor + tintAlpha) / 2.0;
            } else {
                gl_FragColor = textureColor;
            }
        return;
      }

      gl_FragColor = tintAlpha;
      if ( !hatchEnabled ) return;
      float x = abs(vHatchOffset - floor(vHatchOffset + 0.5)) * 2.0;
      float s = hatchThickness * resolution;
      float y0 = clamp((x + 0.5) * s + 0.5, 0.0, 1.0);
      float y1 = clamp((x - 0.5) * s + 0.5, 0.0, 1.0);
      gl_FragColor *= mix(0.3333, 1.0, y0 - y1);
    }
    `;
});

Hooks.on("renderRegionConfig", async function (region, html, c, d) {

    const flagImg = region.document.getFlag(moduleID, "img");
    const flagValue = flagImg ? `value="${flagImg}"` : "";
    const newHTML = `
<div class="form-group"><label>Terrain Image</label>
    <div class="form-fields"><file-picker name="flags.${moduleID}.img" ${flagValue} type="image"><input class="image" type="text"
                placeholder="path/to/file.ext"><button class="fa-solid fa-file-import fa-fw" type="button"
                data-tooltip="Browse Files" aria-label="Browse Files" tabindex="-1"></button></file-picker></div>
    <p class="hint">Determins the number of square of movment it takes to move through each grid square of terrain.</p>
</div>`

    const target = html.querySelector(".region-identity");
    target.insertAdjacentHTML('beforeend', newHTML);

});

Hooks.on("updateRegion", function(doc,change,event,id){
    const hasImgFlag = "img" in (change?.flags?.["region-image"] || {});
    if(hasImgFlag) doc.object.draw(); 
});