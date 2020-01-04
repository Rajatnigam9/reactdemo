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

var mapsZoomLevel = 20;

var initialAddress = "816 West Harrison Street, Chandler, AZ, USA";//"102 S. 28th Street, Phoenix, Arizona 85034";
var initialAddressFormatted = initialAddress.replace(/ /g, '+');

//Static maps documentation : https://developers.google.com/maps/documentation/maps-static/dev-guide#Markers
//var mapImageInitialUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + initialAddressFormatted + "&zoom=" + mapsZoomLevel + "&size=2048x2048&scale=4&maptype=satellite&key=AIzaSyAMRinBN5DcVt1q_Zga_2eREM1HMfrciuU&markers=size:tiny%7Ccolor:red%7C33.4466949,-112.02206699999999";
var mapImageInitialUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + initialAddressFormatted + "&zoom=13&size=1024x2048&scale=1&maptype=satellite&key=AIzaSyAMRinBN5DcVt1q_Zga_2eREM1HMfrciuU";
var initialArizonaMapView = "https://maps.googleapis.com/maps/api/staticmap?center=Arizona&zoom=12&size=2048x2048&scale=4&maptype=satellite&key=AIzaSyAMRinBN5DcVt1q_Zga_2eREM1HMfrciuU"
var mapImageUrl = "https://maps.googleapis.com/maps/api/staticmap?center={LatLngData}&zoom={ZoomLevel}&size=2048x2048&scale=4&maptype=satellite&key=AIzaSyAMRinBN5DcVt1q_Zga_2eREM1HMfrciuU";//&markers=size:tiny%7Ccolor:red%7C{LatLngData}

var cameraDefaultPosition = { 'x': 0, 'y': -0.1, 'z': 3000 };
var canvasDimensionFactor = {
    x: 1,//0.98,
    y: 1//0.80
};



//var drawRoofGeometry = [];

var sceneNumber = 0;
var svgLib = [
    {
        loadSvgArr: [
            { filename: 'gmail', startPos: new THREE.Vector3(- 1000, 200, 0), targetPos: new THREE.Vector3(-600, 200, 0), translationDuration: 1000, fadeDuration: 1000, scaleY: -1 },
            { filename: 'google-text-2', startPos: new THREE.Vector3(500, 100, 0), targetPos: new THREE.Vector3(100, 100, 0), translationDuration: 1000, fadeDuration: 1000, scaleX: 5, scaleY: -5, scaleZ: 10 },
        ]
    },
    {
        loadSvgArr: [
            { filename: 'gmail-2', targetPos: new THREE.Vector3(-250, 100, 0), translationDuration: 1000, fadeDuration: 1000, scaleX : 1, scaleY: -1 },
        ]
    }
];

var curvedMeshesGroup = new THREE.Group();

var enable3dMode = true;
var doubleClickThreshold = 200;//ms
var isDragging = false;
var mouseIsDown = false;
var timer = 0;
var prevent = false;


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
        camera.position.set(cameraDefaultPosition.x, cameraDefaultPosition.y, cameraDefaultPosition.z);
        container = document.getElementById('ThreeJSCanvasContainer');

        // RENDERER
        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        //SCREEN_WIDTH = SCREEN_WIDTH * .7; 
        renderer.setSize(container.offsetWidth * canvasDimensionFactor.x, SCREEN_HEIGHT * canvasDimensionFactor.y);
        renderer.setClearColor(0x0f0f0f, 1);


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

        //Add spinnning top
        this.AddSpinningTop();

        document.addEventListener('click', this.OnClick, false);
        window.addEventListener('wheel', this.OnScroll, false);

        svgLib[sceneNumber].loadSvgArr.forEach(item => {
            this.LoadSVG(item);
            console.log(item);
        }
        );

    },
    OnScroll: function (event) {
        event.preventDefault();

        debugger
        if (curvedMeshesGroup.length > 0)
            curvedMeshesGroup.rotation.z += event.deltaY * 0.5;
    },
    OnClick: function (event) {
        event.preventDefault();

        //Prevent canvas clicks on button clicks
        if (event.target.tagName.toLowerCase() != "canvas")
            return;

        var vector = new THREE.Vector3(
            (event.clientX / window.innerWidth) * 2 - 1,
            - (event.clientY / window.innerHeight) * 2 + 1,
            0.5
        );


        var raycaster = new THREE.Raycaster(); // create once
        var mousePoss = new THREE.Vector2(); // create once

        mousePoss.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mousePoss.y = - (event.clientY / renderer.domElement.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mousePoss, camera);

        var intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {

            var spinningTopName = "SpinningTop";
            if (intersects[0].object.name == spinningTopName || intersects[0].object.parent.name == spinningTopName) {
                scene.remove(scene.getObjectByName(spinningTopName));
                scene.remove(scene.getObjectByName("google-text-2"));

                var logoMesh = scene.getObjectByName("gmail");
                var logoMeshPos = logoMesh.position;

                var tween = new TWEEN.Tween(logoMeshPos).to(new THREE.Vector3(logoMeshPos.x + 350, logoMeshPos.y, logoMeshPos.z), 500).start();

                tween.onComplete(function () {

                    sceneNumber++;
                    svgLib[sceneNumber].loadSvgArr.forEach(item => {
                        WebglEngine.LoadSVG(item);
                    });
                    scene.remove(scene.getObjectByName("gmail"));
                    WebglEngine.AddSpiralCurves();
                });

            }


        }

    },
    onMouseWheel(event) {

        event.preventDefault();

        cubeA.rotation.y += event.deltaY * 0.05;
        cubeB.rotation.y -= event.deltaY * 0.05;

    },
    AddSpinningTop: function () {


        var manager = new THREE.LoadingManager();
        manager.addHandler(/\.dds$/i, new THREE.DDSLoader());
        new THREE.MTLLoader(manager)
            .load('obj/13902_Earth_v1_l3.mtl', function (materials) {


                materials.preload();

                new THREE.OBJLoader(manager)
                    .setMaterials(materials)
                    .load('obj/13902_Earth_v1_l3.obj', function (object) {

                        object.name = "SpinningTop";
                        scene.add(object);
                        //object.rotation.x = -Math.PI / 2 // -1;
                        //object.scale.set(30, 50, 50)
                        object.scale.set(.2, .2, .2)
                        object.position.y = 1000;

                        //object.position.y = - 95;
                        //scene.add(object);

                        renderer.setAnimationLoop(() => {

                            renderer.render(scene, camera)
                            object.rotation.y -= 0.05;
                        });

                    },
                        // called when loading is in progresses
                        function (xhr) {

                            console.log((xhr.loaded / xhr.total * 100) + '% loaded');

                        },
                        // called when loading has errors
                        function (error) {
                            console.log('An error happened');
                        });

            });


        return;
        // instantiate a loader
        var loader = new THREE.OBJLoader();

        // load a resource
        loader.load(
            // resource URL
            'obj/11704_Spinning_Top_v1_L3.obj',
            // called when resource is loaded
            function (object) {

                object.name = "SpinningTop";
                scene.add(object);
                object.rotation.x = -1//-Math.PI / 2;
                object.scale.set(30, 50, 50)
                object.position.y = 1000;

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

    },
    LoadSVG: function (svgObj) {

        //instantiate a loader
        var loader = new THREE.SVGLoader();
        //allow cross origin loading
        loader.crossOrigin = '';
        // load a SVG resource
        loader.load(
            // resource URL
            'svg/' + svgObj.filename + '.svg',
            //'https://svgshare.com/i/H53.svg',
            // called when the resource is loaded
            function (data) {
                var paths = data.paths;
                var group = new THREE.Group();
                group.position.x = typeof (svgObj.startPos) != "undefined" ? svgObj.startPos.x : svgObj.targetPos.x;
                group.position.y = typeof (svgObj.startPos) != "undefined" ? svgObj.startPos.y : svgObj.targetPos.y;

                if (typeof (svgObj.scaleX) != "undefined")
                    group.scale.x *= svgObj.scaleX;
                if (typeof (svgObj.scaleY) != "undefined")
                    group.scale.y *= svgObj.scaleY;
                if (typeof (svgObj.scaleZ) != "undefined")
                    group.scale.z *= svgObj.scaleZ;

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
                            wireframe: false,
                            transparent: true, opacity: 0
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
                            //opacity: path.userData.style.strokeOpacity,
                            //transparent: path.userData.style.strokeOpacity < 1,
                            side: THREE.DoubleSide,
                            depthWrite: false,
                            wireframe: false,
                            transparent: true, opacity: 0
                        });
                        for (var j = 0, jl = path.subPaths.length; j < jl; j++) {
                            var subPath = path.subPaths[j];
                            var geometry = THREE.SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);
                            if (geometry) {
                                var mesh = new THREE.Mesh(geometry, material);
                                group.add(mesh);
                            }
                        }
                    }
                }

                group.name = svgObj.filename;
                scene.add(group);

                if (svgObj.startPos)
                    var tween = new TWEEN.Tween(group.position).to(svgObj.targetPos, svgObj.translationDuration).start();


                if (svgObj.fadeDuration && svgObj.fadeDuration > 0) {
                    group.children.forEach(element => {
                        new TWEEN.Tween(element.material).to({ opacity: 1 }, svgObj.fadeDuration).start();
                    });
                }


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

    },
    ResetCameraViewPoint: function () {
        if (typeof (controls) != "undefined")
            controls.reset();
        camera.position.set(cameraDefaultPosition.x, cameraDefaultPosition.y, cameraDefaultPosition.z);
        //camera.rotation.set(-1.5707963226281547, 0.0000010000357688057516, -1.56662975828881)
    },
    UpdateControls: function () {
        controls.update();

    },
    RenderScene: function () {
        renderer.render(scene, camera);
        TWEEN.update();
    },
    Set3DMode: function (setMode) {
        controls.enableRotate = setMode;
    },
    RenderThreeJsScene: function () {
        requestAnimationFrame(WebglEngine.RenderThreeJsScene);
        WebglEngine.RenderScene();
        WebglEngine.UpdateControls();
    },
    AddSpiralCurves: function () {



        var turns = 5;
        var radius = 10;
        var objPerTurn = 30;

        var angleStep = (Math.PI * 2) / objPerTurn;
        var heightStep = 0.5;

        var shape = new THREE.Shape()
            .moveTo(300, 200)
            .quadraticCurveTo(1000, 1200, 2000, 200)
            .quadraticCurveTo(1000, 800, 240, 200);

        var geom = new THREE.ShapeBufferGeometry(shape);
        geom.rotateX(Math.PI * - 0.5);

        for (let i = 0; i < turns * 5; i++) {
            var value = Math.random() * 0xFF | 0;
            var grayscale = (value << 16) | (value << 8) | value;
            var colorGry = '#' + grayscale.toString(16);
            let plane = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
                color: colorGry//Math.random() * 0x888888 + 0x888888
            }));

            // position
            plane.position.set(
                Math.cos(angleStep * i * 40) * radius,

                Math.sin(angleStep * i * 40) * radius,
                heightStep * i * 40
            );
            // rotation
            plane.rotation.y = - angleStep * i * 4;

            plane.rotation.x = Math.PI / 2;

            curvedMeshesGroup.add(plane);
            radius--;
        }

        scene.add(curvedMeshesGroup);

        curvedMeshesGroup.position.x += 70;
        curvedMeshesGroup.position.y -= 100;

        renderer.setAnimationLoop(() => {

            renderer.render(scene, camera)
            curvedMeshesGroup.rotation.z -= 0.02;
        });
    }

};




WebglEngine.Init();
WebglEngine.RenderThreeJsScene();