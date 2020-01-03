// standard global variables
var container, scene, camera, renderer, controls, stats, gridGround, groundPlane, groundPlaneMaterial, projector, context1, texture1;
var line;
var pointsCount = 0;
var mouse = new THREE.Vector3();
var MAX_POINTS = 500;
var polygonPointsArray = new Float32Array(MAX_POINTS * 3);

var raycaster = new THREE.Raycaster(), INTERSECTED;
var selectedMesh = null;

var exclusionMeshColor = 0xff7800;

//UI Settings
var SolarTopsUIConfig = {
    "RoofColor": 0x2f58d3,
    "RoofOpacity": 0.3,
    "RoofBorderColor": 0x2f58d3,
    "ExclusionBorderColor": 0xb20000,
    "SolarPanelsColor": 0x001b3a,//0x00008b
};
//Geometries : Circle
var geometry = new THREE.CircleGeometry(5);
var material = new THREE.MeshBasicMaterial({ color: SolarTopsUIConfig.RoofBorderColor });
var circleVertices = new THREE.Mesh(geometry, material);
circleVertices.name = "DrawModeVertice";

var drawModeCircle = null;
var mapsZoomLevel = 20;

var initialAddress = "816 West Harrison Street, Chandler, AZ, USA";//"102 S. 28th Street, Phoenix, Arizona 85034";
var initialAddressFormatted = initialAddress.replace(/ /g, '+');

//Static maps documentation : https://developers.google.com/maps/documentation/maps-static/dev-guide#Markers
//var mapImageInitialUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + initialAddressFormatted + "&zoom=" + mapsZoomLevel + "&size=2048x2048&scale=4&maptype=satellite&key=AIzaSyAMRinBN5DcVt1q_Zga_2eREM1HMfrciuU&markers=size:tiny%7Ccolor:red%7C33.4466949,-112.02206699999999";
var mapImageInitialUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + initialAddressFormatted + "&zoom=13&size=1024x2048&scale=1&maptype=satellite&key=AIzaSyAMRinBN5DcVt1q_Zga_2eREM1HMfrciuU";
var initialArizonaMapView = "https://maps.googleapis.com/maps/api/staticmap?center=Arizona&zoom=12&size=2048x2048&scale=4&maptype=satellite&key=AIzaSyAMRinBN5DcVt1q_Zga_2eREM1HMfrciuU"
var mapImageUrl = "https://maps.googleapis.com/maps/api/staticmap?center={LatLngData}&zoom={ZoomLevel}&size=2048x2048&scale=4&maptype=satellite&key=AIzaSyAMRinBN5DcVt1q_Zga_2eREM1HMfrciuU";//&markers=size:tiny%7Ccolor:red%7C{LatLngData}

//SolarPanelsGroup
var solarPanelsGroup = new THREE.Group();

var planBoxesMap = [];
var planBoxesEdgesMap = [];
var cogSphereMap = [];
var selectedBox = null;

var meshesFoorDesign = [];

//Solar panel configuration: height width, offset, orientation
var solarPaneSize = { x: 60, y: 24, "XOffset": 2, "YOffset": 2 };
var solarPaneOffset = { x: 1, y: 1 };

var cameraDefaultPosition = { 'x': 0, 'y': -0.1, 'z': 600 };
var canvasDimensionFactor = {
    x: 1,//0.98,
    y: 1//0.80
};

//Drawevent
var isDrawRoof = false;
var isDrawPolygonExclusion = false;
var isDrawCircularExclusion = false;
var isShowPanels = false;

var drawCircularExclusion = false;
var drawPolygonExclusion = false;
var drawRoof = false;

//var drawRoofGeometry = [];

var DrawMode = {
    "CircularExclusionStartPoint": null,
    //"PolygonExclusionPointArray": [],
    //"PolygonRoofPointArray": new Float32Array(MAX_POINTS * 3)
    "PolygonPointsArray": new Float32Array(MAX_POINTS * 3),
    "VirtualDrawMesh": null,
    "LineZIndex": 2.5
};

var enable3dMode = true;
var doubleClickThreshold = 200;//ms
var isDragging = false;
var mouseIsDown = false;
var timer = 0;
var prevent = false;

//Design Json
var designData = {
    "RoofLayout": [
        //----------------------DATA FORMAT EXAMPLE BELOW---------------------------

        //{
        //"Type": "PolygonRoof", "GeometryData": {
        //    "PointsArray":
        //        [{ "x": 1, "y": 1 }, { "x": 4, "y": 1 }, { "x": 4, "y": 3 }]
        //}
    ], // List of RoofPolygons with their cordinates and other metadata
    "ExclusionData": [

        //----------------------DATA FORMAT EXAMPLE BELOW---------------------------
        //{ "Type": "CircularExclusion", "GeometryData": { "radius": 2, "Position": { "x": 2, "y": 2 ,"z":1} } },
        //{ "Type": "PolygonExclusion", "GeometryData": {"PointsArray": { "x": 2, "y": 2 } } }
    ],// List of Exclusion with their cordinates and other metadata
    "PanelsData": []

};

var WebglEngine = {
    Init: function () {
        // SCENE
        scene = new THREE.Scene();

        // CAMERA
        var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;

        camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
        camera.position.z = 500;
        camera.up.set(0, 0, 1);

        scene.add(camera);
        this.ResetCameraViewPoint();
        camera.position.set(cameraDefaultPosition.x, cameraDefaultPosition.y, cameraDefaultPosition.z + 800);
        container = document.getElementById('ThreeJSCanvasContainer');

        // RENDERER
        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        //SCREEN_WIDTH = SCREEN_WIDTH * .7; 
        renderer.setSize(container.offsetWidth * canvasDimensionFactor.x, SCREEN_HEIGHT * canvasDimensionFactor.y);
        renderer.setClearColor(0xffffff, 1);


        container.prepend(renderer.domElement);

        // CONTROLS
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.userPanSpeed = 10;
        //controls.enabled = false;

        // LIGHT
        var light = new THREE.PointLight(0xffffff, 1);
        light.position.set(210, 450, 200);
        scene.add(light);
        var spotLight = new THREE.SpotLight(0xffffff);
        spotLight.position.set(0, 0, 100);
        scene.add(spotLight);
        var light2 = new THREE.AmbientLight(0xffffff); // soft white light
        scene.add(light2);


        var ambientLight = new THREE.AmbientLight('#fff');
        scene.add(ambientLight);

        // Grid Creation
        //Multiply initial two parameters below by some factors to increase/decrease grid size
        gridGround = new THREE.GridHelper(1000, 30, 0x3f3f3f, 0x3f3f3f);

        //Base ground with map
        var basePlaneGeometry = new THREE.PlaneGeometry(container.offsetWidth * 2, container.offsetHeight * 2, 1, 1);
        var texture = new THREE.TextureLoader().load(mapImageInitialUrl);
        texture.anisotropy = renderer.getMaxAnisotropy();
        texture.minFilter = THREE.LinearFilter;
        groundPlaneMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });//new THREE.MeshLambertMaterial();
        groundPlane = new THREE.Mesh(basePlaneGeometry, groundPlaneMaterial);

        // rotate and position the plane
        groundPlane.rotation.x = 2 * Math.PI;
        groundPlane.position.set(0, 0, 0);
        //scene.add(groundPlane);
        var smileyMouthPath = new THREE.Path()
            .moveTo(20, 20)
            .quadraticCurveTo(500, 600, 1000, 100)
            .quadraticCurveTo(500, 400, 120, 100);
        var smileyMouthPathLeftFlat = new THREE.Path()
            .moveTo(40, 40)
            .quadraticCurveTo(100, 100, 200, 20)
            .quadraticCurveTo(100, 60, 60, 20);
            smileyMouthPathLeftFlat.autoClose=true;
        var sharpArray=[];
            // for(var i=0;i<5;i++)
            // {
            //     var smileyMouthPathsharp = new THREE.Path()
            //     .moveTo(20*(i*10), 20+(i*10))
            //     .quadraticCurveTo(500/(i+1), 600/(i+1), 1000/(i+1), 100/(i+1))
            //     .quadraticCurveTo(500/(i+1), 400/(i+1), 120/(i+1), 100/(i+1));
            //     smileyMouthPathsharp.autoClose=true;
            //     smileyMouthPathsharp.autoClose = true;
            //     var points = smileyMouthPathsharp.getPoints();
            //     var spacedPoints = smileyMouthPathsharp.getSpacedPoints(50);
            //     var geometryPoints = new THREE.BufferGeometry().setFromPoints(points);
            //     var geometrySpacedPoints = new THREE.BufferGeometry().setFromPoints(spacedPoints);
            //     var line = new THREE.Line(geometryPoints, new THREE.MeshBasicMaterial({ color: 0xf000f0 }));
            //     scene.add(line);
            //     sharpArray.push(smileyMouthPath);
            // }
            
var radius = 10;
var turns = 3;
var objPerTurn = 30;

var angleStep = (Math.PI * 2) / objPerTurn;
var heightStep = 0.5;
var points = smileyMouthPath.getPoints();
var geom = new THREE.BufferGeometry().setFromPoints(points);;

for (let i = 0; i < turns * objPerTurn; i++) {
  let plane = new THREE.CatmullRomCurve3(geom, new THREE.MeshBasicMaterial({
    color: Math.random() * 0x888888 + 0x888888
  }));
  
  // position
  plane.position.set(
    Math.cos(angleStep * i) * radius,
    heightStep * i,
    Math.sin(angleStep * i) * radius
  );
  
  // rotation
  plane.rotation.y = - angleStep * i;
  scene.add(plane);
}
        var smileyMouthPathsharp = new THREE.Path()
            .moveTo(20, 20)
            .quadraticCurveTo(500, 600, 1000, 100)
            .quadraticCurveTo(500, 400, 120, 100);
            smileyMouthPathsharp.autoClose=true;
        smileyMouthPath.autoClose = true;
        var points = smileyMouthPath.getPoints();
        var spacedPoints = smileyMouthPath.getSpacedPoints(50);
        var geometryPoints = new THREE.BufferGeometry().setFromPoints(points);
        var geometrySpacedPoints = new THREE.BufferGeometry().setFromPoints(spacedPoints);
        var line = new THREE.Line(geometryPoints, new THREE.LineBasicMaterial({ color: 0xf000f0 }));
        //scene.add(line);
        points=smileyMouthPathsharp.getPoints();
        spacedPoints = smileyMouthPathsharp.getSpacedPoints(50);
        geometryPoints = new THREE.BufferGeometry().setFromPoints(points);
        geometrySpacedPoints = new THREE.BufferGeometry().setFromPoints(spacedPoints);
        line = new THREE.Line(geometryPoints, new THREE.LineBasicMaterial({ color: 0xf000f0 }));
        //scene.add(line);
        //Solar pane geometry
        var planeGeometry = new THREE.PlaneGeometry(solarPaneSize.x, solarPaneSize.y);
        var planematerial = new THREE.MeshBasicMaterial({ color: SolarTopsUIConfig.SolarPanelsColor, side: THREE.DoubleSide });
        solarPaneMesh = new THREE.Mesh(planeGeometry, planematerial);

        //scene.add(solarPaneMesh);
        //solarPaneMesh.position.z = 12;
        //initialise projecter for raycasting
        //projector = new THREE.Projector();



        //instantiate a loader
        var loader = new THREE.SVGLoader();
        //allow cross origin loading
        loader.crossOrigin = '';
        // load a SVG resource
        loader.load(
            // resource URL
            '',
            //'https://svgshare.com/i/H53.svg',
            // called when the resource is loaded
            function (data) {

                var paths = data.paths;
                var group = new THREE.Group();
                group.position.x = - 70;
                group.position.y = 0;
                group.scale.y *= - 1;
                group.rotation.set(0,0,0);
                for (var i = 0; i < paths.length; i++) {
                    var path = paths[i];
                    var fillColor = path.userData.style.fill;
                    //if (guiData.drawFillShapes && fillColor !== undefined && fillColor !== 'none') {
                    if (true && fillColor !== undefined && fillColor !== 'none') {
                        var material = new THREE.MeshBasicMaterial({
                            color: new THREE.Color().setStyle(fillColor),
                            opacity: path.userData.style.fillOpacity,
                            transparent: path.userData.style.fillOpacity < 1,
                            side: THREE.DoubleSide,
                            depthWrite: false,
                            wireframe: false
                        });
                        var shapes = path.toShapes(true);
                        for (var j = 0; j < shapes.length; j++) {
                            var shape = shapes[j];
                            var geometry = new THREE.ShapeBufferGeometry(shape);
                            var mesh = new THREE.Mesh(geometry, material);
                            group.add(mesh);
                        }
                    }
                    var strokeColor = path.userData.style.stroke;
                    //if (guiData.drawStrokes && strokeColor !== undefined && strokeColor !== 'none') {
                    if (true && strokeColor !== undefined && strokeColor !== 'none') {
                        var material = new THREE.MeshBasicMaterial({
                            color: new THREE.Color().setStyle(strokeColor),
                            opacity: path.userData.style.strokeOpacity,
                            transparent: path.userData.style.strokeOpacity < 1,
                            side: THREE.DoubleSide,
                            depthWrite: false,
                            wireframe: false
                        });
                        for (var j = 0, jl = path.subPaths.length; j < jl; j++) {
                            var subPath = path.subPaths[j];
                            debugger
                            var geometry = THREE.SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);
                            if (geometry) {
                                var mesh = new THREE.Mesh(geometry, material);
                                group.add(mesh);
                            }
                        }
                    }
                }


                scene.add(group);
                //group.scale.set(4,4,4)
                //svgGroup.position.y = 10;

            },
            // called when loading is in progresses
            function (xhr) {

                console.log((xhr.loaded / xhr.total * 100) + '% loaded');

            },
            // called when loading has errors
            function (error) {

                console.log('An error happened');

            }
        );



        // load a SVG resource
        loader.load(
            // resource URL
            '',
            // called when the resource is loaded
            function (data) {

                var paths = data.paths;
                var group = new THREE.Group();

                for (var i = 0; i < paths.length; i++) {

                    var path = paths[i];

                    var material = new THREE.MeshBasicMaterial({
                        color: path.color,
                        side: THREE.DoubleSide,
                        depthWrite: false
                    });

                    var shapes = path.toShapes(true);

                    for (var j = 0; j < shapes.length; j++) {

                        var shape = shapes[j];
                        var geometry = new THREE.ShapeBufferGeometry(shape);
                        var mesh = new THREE.Mesh(geometry, material);
                        group.add(mesh);

                    }

                }

                scene.add(group);
                group.position.z = 50

            },
            // called when loading is in progresses
            function (xhr) {

                console.log((xhr.loaded / xhr.total * 100) + '% loaded');

            },
            // called when loading has errors
            function (error) {

                console.log('An error happened');

            });


    },
    ResetCameraViewPoint: function () {
        if (typeof (controls) != "undefined")
            controls.reset();
        camera.position.set(cameraDefaultPosition.x, cameraDefaultPosition.y, cameraDefaultPosition.z);
        camera.rotation.set(-1.5707963226281547, 0.0000010000357688057516, -1.56662975828881)
    },
    UpdateControls: function () {
        controls.update();

    },
    RenderScene: function () {
        renderer.render(scene, camera);
    },
    Set3DMode: function (setMode) {
        controls.enableRotate = setMode;
        $('#EnableDisable3DMode').toggleClass("active", !setMode)
    },
    RenderThreeJsScene: function () {
        requestAnimationFrame(WebglEngine.RenderThreeJsScene);
        WebglEngine.RenderScene();
        WebglEngine.UpdateControls();
    },

};




WebglEngine.Init();
WebglEngine.RenderThreeJsScene();
//PalletManager.LoadSolarPanelMakers();
//PalletManager.LoadStorages();
//PalletManager.BindEventsForPanelmaker();
//PalletManager.SetOnPageLoadData();
