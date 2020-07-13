/*
 * 3DCityDB-Web-Map-Client
 * http://www.3dcitydb.org/
 * 
 * Copyright 2015 - 2017
 * Chair of Geoinformatics
 * Technical University of Munich, Germany
 * https://www.gis.bgu.tum.de/
 * 
 * The 3DCityDB-Web-Map-Client is jointly developed with the following
 * cooperation partners:
 * 
 * virtualcitySYSTEMS GmbH, Berlin <http://www.virtualcitysystems.de/>
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 *     
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**-----------------------------------------Separate Line-------------------------------------------------**/

/*---------------------------------  set globe variables  ----------------------------------------*/
// BingMapsAPI Key for Bing Imagery Layers and Geocoder
// If this is not valid, the Bing Imagery Layers will be removed and the Bing Geocoder will be replaced with OSM Nominatim
var bingToken = CitydbUtil.parse_query_string('bingToken', window.location.href);
if (Cesium.defined(bingToken) && bingToken !== "") {
    Cesium.BingMapsApi.defaultKey = bingToken;
}

// Define clock to be animated per default
var clock = new Cesium.Clock({
    shouldAnimate: true
});

// create 3Dcitydb-web-map instance
var shadows = CitydbUtil.parse_query_string('shadows', window.location.href);
var terrainShadows = CitydbUtil.parse_query_string('terrainShadows', window.location.href);

// Set coordinates for homebutton
var extent = Cesium.Rectangle.fromDegrees(17.02350, 59.37313, 17.04289, 59.37814);
Cesium.Camera.DEFAULT_VIEW_RECTANGLE = extent;
Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

var cesiumViewerOptions = {
    baseLayerPicker: true,
    terrainProvider: new Cesium.CesiumTerrainProvider({
        url: Cesium.IonResource.fromAssetId(113751)
    }),
    timeline: false,
    animation: false,
    fullscreenButton: false,
    shadows: (shadows == "true"),
    terrainShadows: parseInt(terrainShadows),
    clockViewModel: new Cesium.ClockViewModel(clock),
    scene3DOnly: false,
    vrButton: false,
    projectionPicker: false,
    automaticallyTrackDataSourceClocks: true,
    infoBox: true,
    homeButton: true,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    useBrowserRecommendedResolution: false
    // // Use high-res stars downloaded from https://github.com/AnalyticalGraphicsInc/cesium-assets
    // skyBox : new Cesium.SkyBox({
    //     sources : {
    //       positiveX : 'stars/TychoSkymapII.t3_08192x04096_80_px.jpg',
    //       negativeX : 'stars/TychoSkymapII.t3_08192x04096_80_mx.jpg',
    //       positiveY : 'stars/TychoSkymapII.t3_08192x04096_80_py.jpg',
    //       negativeY : 'stars/TychoSkymapII.t3_08192x04096_80_my.jpg',
    //       positiveZ : 'stars/TychoSkymapII.t3_08192x04096_80_pz.jpg',
    //       negativeZ : 'stars/TychoSkymapII.t3_08192x04096_80_mz.jpg'
    //     }
    // }),
}
// If neither BingMapsAPI key nor ionToken is present, use the OpenStreetMap Geocoder Nominatim
var ionToken = CitydbUtil.parse_query_string('ionToken', window.location.href);
if (Cesium.defined(ionToken) && ionToken !== "") {
    Cesium.Ion.defaultAccessToken = ionToken;
}
if ((!Cesium.defined(Cesium.BingMapsApi.defaultKey) || Cesium.BingMapsApi.defaultKey === "")
    && (!Cesium.defined(ionToken) || ionToken === "")) {
    cesiumViewerOptions.geocoder = new OpenStreetMapNominatimGeocoder();
}

var cesiumViewer = new Cesium.Viewer('cesiumContainer', cesiumViewerOptions);

// Suspend the camera to go below terrain, this is not working properly when terrain is still rendering
cesiumViewer.camera.changed.addEventListener(
    function () {
        if (cesiumViewer.camera._suspendTerrainAdjustment && cesiumViewer.scene.mode === Cesium.SceneMode.SCENE3D) {
            cesiumViewer.camera._suspendTerrainAdjustment = false;
            cesiumViewer.camera._adjustHeightForTerrain();
        }
    }
);

adjustIonFeatures();

// No need for navigation as for now
// navigationInitialization('cesiumContainer', cesiumViewer);


// Init camera view @ Strängnäs stad
var startpositionCamera = cesiumViewer.camera;
startpositionCamera.setView({
    destination: Cesium.Cartesian3.fromDegrees(17.02528, 59.38704, 400.0),
    orientation: {
        heading : Cesium.Math.toRadians(175.0),
        pitch : Cesium.Math.toRadians(-20.0)
    }
});

// var cesiumCamera = cesiumViewer.scene.camera;
var webMap = new WebMap3DCityDB(cesiumViewer);

// Fly to contribution
function flyToContribution(destination, duration, heading) {
    var flyToModelContribution = cesiumViewer.camera;
    flyToModelContribution.flyTo({
        destination: destination,
        duration: duration,
        orientation: {
            heading: heading,
            pitch: Cesium.Math.toRadians(-20.0),
            roll: 0.0
        }
    });
};
// Hide buildings in citymodel that is not part of contribution
function hideObjectsForContribution(listOfObjectId) {
    var layers = webMap._layers;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].active) {
            layers[i].hideObjects(listOfObjectId);
        }
    }
};
// Toggle the settings for contribution model
function toggleContributionSettings() {
    !this.isToggled ? addNewLayer() : removeSelectedLayer();
    this.isToggled ? showHiddenObjects() : false;
    this.isToggled = !this.isToggled;
};

var addLayerViewModel;

addLayerViewModel = {
    url: "../modeller/primar/primar_collada_MasterJSON.json",
    name: "Strängnäs stadsmodell",
    layerDataType: "COLLADA/KML/glTF",
    gltfVersion: "2.0",
    thematicDataUrl: "https://kartservice.strangnas.se/service/lm/getbuilding",
    thematicDataSource: "PostgreSQL",
    tableType: "Horizontal",
    // googleSheetsApiKey: "",
    // googleSheetsRanges: "",
    // googleSheetsClientId: "",
    cityobjectsJsonUrl: "",
    minLodPixels: "220",
    maxLodPixels: "-1",
    maxSizeOfCachedTiles: 200,
    maxCountOfVisibleTiles: 200
};
addNewLayer();

function addContributionModel() {
    addLayerViewModel = {
        url: "",
        name: "",
        layerDataType: "COLLADA/KML/glTF",
        gltfVersion: "1.0",
        thematicDataUrl: "",
        cityobjectsJsonUrl: "",
        minLodPixels: "1",
        maxLodPixels: "-1",
        maxSizeOfCachedTiles: 200,
        maxCountOfVisibleTiles: 200
    };
    flyToContribution(Cesium.Cartesian3.fromDegrees(17.01839, 59.37571, 300.0), 3, -Cesium.Math.PI_OVER_TWO);
    hideObjectsForContribution([]);
    toggleContributionSettings();
};

Cesium.knockout.applyBindings(addLayerViewModel, document.getElementById('citydb_addlayerpanel'));
Cesium.knockout.track(addLayerViewModel);


var addWmsViewModel = {
    name: '',
    iconUrl: '',
    tooltip: '',
    url: '',
    layers: '',
    additionalParameters: '',
    proxyUrl: '/proxy/'
};
Cesium.knockout.track(addWmsViewModel);
Cesium.knockout.applyBindings(addWmsViewModel, document.getElementById('citydb_addwmspanel'));

var addTerrainViewModel = {
    name: '',
    iconUrl: '',
    tooltip: '',
    url: ''
};
Cesium.knockout.track(addTerrainViewModel);
Cesium.knockout.applyBindings(addTerrainViewModel, document.getElementById('citydb_addterrainpanel'));

var addSplashWindowModel = {
    url: '',
    showOnStart: ''
};
Cesium.knockout.track(addSplashWindowModel);
Cesium.knockout.applyBindings(addSplashWindowModel, document.getElementById('citydb_addsplashwindow'));

/*---------------------------------  Load Configurations and Layers  ----------------------------------------*/

intiClient();

// Store clicked entities
var clickedEntities = {};

var clockElementClicked = false;
function intiClient() {
    // adjust cesium navigation help popup for splash window
    // insertSplashInfoHelp();
    // read splash window from url
    // getSplashWindowFromUrl();

    // init progress indicator gif
    document.getElementById('loadingIndicator').style.display = 'none';

    // activate mouseClick Events		
    webMap.activateMouseClickEvents(true);
    webMap.activateMouseMoveEvents(true);
    webMap.activateViewChangedEvent(true);

    // add Copyrights, TUM, 3DCityDB or more...
    var creditDisplay = cesiumViewer.scene.frameState.creditDisplay;

    var citydbCreditLogo = new Cesium.Credit('<a href="https://www.3dcitydb.org/" target="_blank">3DCityDB</a>');
    creditDisplay.addDefaultCredit(citydbCreditLogo);

    var tumCreditLogo = new Cesium.Credit('<a href="https://www.gis.bgu.tum.de/en/home/" target="_blank">© 2018 Chair of Geoinformatics, TU Munich</a>');
    creditDisplay.addDefaultCredit(tumCreditLogo);

    var lmCreditLogo = new Cesium.Credit('<a href="https://lantmateriet.se" target="_blank">© Lantmäteriet Geodatasamverkan</a>');
    creditDisplay.addDefaultCredit(lmCreditLogo);

    var strangnasCreditLogo = new Cesium.Credit('<a href="https://strangnas.se" target="_blank">© Strängnäs kommun</a>');
    creditDisplay.addDefaultCredit(strangnasCreditLogo);

    // activate debug mode
    var debugStr = CitydbUtil.parse_query_string('debug', window.location.href);
    if (debugStr == "true") {
        cesiumViewer.extend(Cesium.viewerCesiumInspectorMixin);
        cesiumViewer.cesiumInspector.viewModel.dropDownVisible = false;
    }

    // set title of the web page
    var titleStr = CitydbUtil.parse_query_string('title', window.location.href);
    if (titleStr) {
        document.title = titleStr;
    }

    // // It's an extended Geocoder widget which can also be used for searching object by its gmlid.
    // cesiumViewer.geocoder.viewModel._searchCommand.beforeExecute.addEventListener(function (info) {
    //     var callGeocodingService = info.args[0];
    //     if (callGeocodingService != true) {
    //         var gmlId = cesiumViewer.geocoder.viewModel.searchText;
    //         info.cancel = true;
    //         cesiumViewer.geocoder.viewModel.searchText = 'Söker......';
    //         zoomToObjectById(gmlId, function () {
    //             cesiumViewer.geocoder.viewModel.searchText = gmlId;
    //         }, function () {
    //             cesiumViewer.geocoder.viewModel.searchText = gmlId;
    //             cesiumViewer.geocoder.viewModel.search.call(this, true);
    //         });
    //     }
    // });

    // inspect the status of the showed and cached tiles	
    // inspectTileStatus();

    // display current infos of active layer in the main menu
    observeActiveLayer();

    // Zoom to desired camera position and load layers if encoded in the url...	
    zoomToDefaultCameraPosition().then(function (info) {
        var layers = getLayersFromUrl();
        loadLayerGroup(layers);

        var basemapConfigString = CitydbUtil.parse_query_string('basemap', window.location.href);
        if (basemapConfigString) {
            var viewMoModel = Cesium.queryToObject(Object.keys(Cesium.queryToObject(basemapConfigString))[0]);
            for (key in viewMoModel) {
                addWmsViewModel[key] = viewMoModel[key];
            }
            addWebMapServiceProvider();
        }

        var cesiumWorldTerrainString = CitydbUtil.parse_query_string('cesiumWorldTerrain', window.location.href);
        if (cesiumWorldTerrainString === "true") {
            // if the Cesium World Terrain is given in the URL --> activate, else other terrains
            cesiumViewer.terrainProvider = Cesium.createWorldTerrain();
            var baseLayerPickerViewModel = cesiumViewer.baseLayerPicker.viewModel;
            baseLayerPickerViewModel.selectedTerrain = baseLayerPickerViewModel.terrainProviderViewModels[1];
        } else {
            var terrainConfigString = CitydbUtil.parse_query_string('terrain', window.location.href);
            if (terrainConfigString) {
                var viewMoModel = Cesium.queryToObject(Object.keys(Cesium.queryToObject(terrainConfigString))[0]);
                for (key in viewMoModel) {
                    addTerrainViewModel[key] = viewMoModel[key];
                }
                addTerrainProvider();
            }
        }
    });

    // jump to a timepoint
    var dayTimeStr = CitydbUtil.parse_query_string('dayTime', window.location.href);
    if (dayTimeStr) {
        var julianDate = Cesium.JulianDate.fromIso8601(decodeURIComponent(dayTimeStr));
        var clock = cesiumViewer.cesiumWidget.clock;
        clock.currentTime = julianDate;
        clock.shouldAnimate = false;
    }

    // add a calendar picker in the timeline using the JS library flatpickr
    var clockElement = document.getElementsByClassName("citydb_flatpickr")[0];
    flatpickr(clockElement, {
        enableTime: true,
        defaultDate: Cesium.JulianDate.toDate(cesiumViewer.clock.currentTime),
        enableSeconds: false,
        disableMobile: true
    });
    clockElement.addEventListener("change", function () {
        var dateValue = clockElement.value;
        var cesiumClock = cesiumViewer.clock;
        cesiumClock.shouldAnimate = false; // stop the clock
        cesiumClock.currentTime = Cesium.JulianDate.fromIso8601(dateValue.replace(" ", "T") + "Z");
        // update timeline also
        var cesiumTimeline = cesiumViewer.timeline;
        var lowerBound = Cesium.JulianDate.addHours(cesiumViewer.clock.currentTime, -12, new Object());
        var upperBound = Cesium.JulianDate.addHours(cesiumViewer.clock.currentTime, 12, new Object());
        cesiumTimeline.updateFromClock(); // center the needle in the timeline
        cesiumViewer.timeline.zoomTo(lowerBound, upperBound);
        cesiumViewer.timeline.resize();
    });
    clockElement.addEventListener("click", function () {
        if (clockElementClicked) {
            clockElement._flatpickr.close();
        }
        clockElementClicked = !clockElementClicked;
    });

    // // Bring the cesium navigation help popup above the compass
    // var cesiumNavHelp = document.getElementsByClassName("cesium-navigation-help")[0];
    // cesiumNavHelp.style.zIndex = 99999;

    // If the web client has a layer, add an onclick event to the home button to fly to this layer
    var cesiumHomeButton = document.getElementsByClassName("cesium-button cesium-toolbar-button cesium-home-button")[0];
    cesiumHomeButton.onclick = function () {
        zoomToDefaultCameraPosition();
    }
}

function observeActiveLayer() {
    var observable = Cesium.knockout.getObservable(webMap, '_activeLayer');

    observable.subscribe(function (selectedLayer) {
        if (Cesium.defined(selectedLayer)) {
            document.getElementById(selectedLayer.id).childNodes[0].checked = true;

            updateAddLayerViewModel(selectedLayer);
        }
    });

    function updateAddLayerViewModel(selectedLayer) {
        addLayerViewModel.url = selectedLayer.url;
        addLayerViewModel.name = selectedLayer.name;
        addLayerViewModel.layerDataType = selectedLayer.layerDataType;
        addLayerViewModel.gltfVersion = selectedLayer.gltfVersion;
        addLayerViewModel.thematicDataUrl = selectedLayer.thematicDataUrl;
        addLayerViewModel.thematicDataSource = selectedLayer.thematicDataSource;
        addLayerViewModel.tableType = selectedLayer.tableType;
        // addLayerViewModel.googleSheetsApiKey = selectedLayer.googleSheetsApiKey;
        // addLayerViewModel.googleSheetsRanges = selectedLayer.googleSheetsRanges;
        // addLayerViewModel.googleSheetsClientId = selectedLayer.googleSheetsClientId;
        addLayerViewModel.cityobjectsJsonUrl = selectedLayer.cityobjectsJsonUrl;
        addLayerViewModel.minLodPixels = selectedLayer.minLodPixels;
        addLayerViewModel.maxLodPixels = selectedLayer.maxLodPixels;
        addLayerViewModel.maxSizeOfCachedTiles = selectedLayer.maxSizeOfCachedTiles;
        addLayerViewModel.maxCountOfVisibleTiles = selectedLayer.maxCountOfVisibleTiles;
    }
}

function adjustIonFeatures() {
    // If neither BingMapsAPI key nor ion access token is present, remove Bing Maps from the Imagery Providers
    if (!Cesium.defined(Cesium.BingMapsApi.defaultKey) || Cesium.BingMapsApi.defaultKey === "") {
        var imageryProviders = cesiumViewer.baseLayerPicker.viewModel.imageryProviderViewModels;
        var i = 0;
        while (i < imageryProviders.length) {
            if (imageryProviders[i].name.indexOf("Bing Maps") !== -1) {
                //imageryProviders[i]._creationCommand.canExecute = false;
                imageryProviders.remove(imageryProviders[i]);
            } else {
                i++;
            }
        }
        console.warn("Please enter your Bing Maps API token using the URL-parameter \"bingToken=<your-token>\" and refresh the page if you wish to use Bing Maps.");

        // Set default imagery to ESRI World Imagery
        cesiumViewer.baseLayerPicker.viewModel.selectedImagery = imageryProviders[0];

        // Disable auto-complete of OSM Geocoder due to OSM usage limitations
        // see https://operations.osmfoundation.org/policies/nominatim/#unacceptable-use
        cesiumViewer._geocoder._viewModel.autoComplete = false;
    }

    // Remove Cesium World Terrain from the Terrain Providers
    //        var terrainProviders = cesiumViewer.baseLayerPicker.viewModel.terrainProviderViewModels;
    //        i = 0;
    //        while (i < terrainProviders.length) {
    //            if (terrainProviders[i].name.indexOf("Cesium World Terrain") !== -1) {
    //                //terrainProviders[i]._creationCommand.canExecute = false;
    //                terrainProviders.remove(terrainProviders[i]);
    //            } else {
    //                i++;
    //            }
    //        }
    //        console.log("Due to invalid or missing ion access token from user, Cesium World Terrain has been removed.");

    // Set default imagery to an open-source terrain
    // cesiumViewer.baseLayerPicker.viewModel.selectedTerrain = terrainProviders[0];
    console.warn("Please enter your ion access token using the URL-parameter \"ionToken=<your-token>\" and refresh the page if you wish to use ion features.");
}

/*---------------------------------  methods and functions  ----------------------------------------*/

function inspectTileStatus() {
    setInterval(function () {
        var cachedTilesInspector = document.getElementById('citydb_cachedTilesInspector');
        var showedTilesInspector = document.getElementById('citydb_showedTilesInspector');
        var layers = webMap._layers;
        var numberOfshowedTiles = 0;
        var numberOfCachedTiles = 0;
        var numberOfTasks = 0;
        var tilesLoaded = true;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            if (layers[i].active) {
                if (layer instanceof CitydbKmlLayer) {
                    numberOfshowedTiles = numberOfshowedTiles + Object.keys(layers[i].citydbKmlTilingManager.dataPoolKml).length;
                    numberOfCachedTiles = numberOfCachedTiles + Object.keys(layers[i].citydbKmlTilingManager.networklinkCache).length;
                    numberOfTasks = numberOfTasks + layers[i].citydbKmlTilingManager.taskNumber;
                }
                if (layer instanceof Cesium3DTilesDataLayer) {
                    numberOfshowedTiles = numberOfshowedTiles + layer._tileset._selectedTiles.length;
                    numberOfCachedTiles = numberOfCachedTiles + layer._tileset._statistics.numberContentReady;
                    tilesLoaded = layer._tileset._tilesLoaded;
                }
            }
        }
        showedTilesInspector.innerHTML = 'Number of showed Tiles: ' + numberOfshowedTiles;
        cachedTilesInspector.innerHTML = 'Number of cached Tiles: ' + numberOfCachedTiles;

        var loadingTilesInspector = document.getElementById('citydb_loadingTilesInspector');
        if (numberOfTasks > 0 || !tilesLoaded) {
            loadingTilesInspector.style.display = 'block';
        } else {
            loadingTilesInspector.style.display = 'none';
        }
    }, 200);
}

function getLayersFromUrl() {
    var index = 0;
    var nLayers = new Array();
    var layerConfigString = CitydbUtil.parse_query_string('layer_' + index, window.location.href);
    while (layerConfigString) {
        var layerConfig = Cesium.queryToObject(Object.keys(Cesium.queryToObject(layerConfigString))[0]);
        var options = {
            url: layerConfig.url,
            name: layerConfig.name,
            layerDataType: Cesium.defaultValue(layerConfig.layerDataType, "COLLADA/KML/glTF"),
            gltfVersion: Cesium.defaultValue(layerConfig.gltfVersion, "2.0"),
            thematicDataUrl: Cesium.defaultValue(layerConfig.spreadsheetUrl, ""),
            thematicDataSource: Cesium.defaultValue(layerConfig.thematicDataSource, "GoogleSheets"),
            tableType: Cesium.defaultValue(layerConfig.tableType, "Horizontal"),
            // googleSheetsApiKey: Cesium.defaultValue(layerConfig.googleSheetsApiKey, ""),
            // googleSheetsRanges: Cesium.defaultValue(layerConfig.googleSheetsRanges, ""),
            // googleSheetsClientId: Cesium.defaultValue(layerConfig.googleSheetsClientId, ""),
            cityobjectsJsonUrl: Cesium.defaultValue(layerConfig.cityobjectsJsonUrl, ""),
            active: (layerConfig.active == "true"),
            minLodPixels: Cesium.defaultValue(layerConfig.minLodPixels, 140),
            maxLodPixels: Cesium.defaultValue(layerConfig.maxLodPixels == -1 ? Number.MAX_VALUE : layerConfig.maxLodPixels, Number.MAX_VALUE),
            maxSizeOfCachedTiles: layerConfig.maxSizeOfCachedTiles,
            maxCountOfVisibleTiles: layerConfig.maxCountOfVisibleTiles
        }

        if (['kml', 'kmz', 'json', 'czml'].indexOf(CitydbUtil.get_suffix_from_filename(layerConfig.url)) > -1 && options.layerDataType === "COLLADA/KML/glTF") {
            nLayers.push(new CitydbKmlLayer(options));
        } else {
            nLayers.push(new Cesium3DTilesDataLayer(options));
        }

        index++;
        layerConfigString = CitydbUtil.parse_query_string('layer_' + index, window.location.href);
    }
    return nLayers;
}

function listHighlightedObjects() {
    var highlightingListElement = document.getElementById("citydb_highlightinglist");

    emptySelectBox(highlightingListElement, function () {
        var highlightedObjects = webMap.getAllHighlightedObjects();
        for (var i = 0; i < highlightedObjects.length; i++) {
            var option = document.createElement("option");
            option.text = highlightedObjects[i];
            highlightingListElement.add(option);
            highlightingListElement.selectedIndex = 0;
        }
    });
}

function listHiddenObjects() {
    var hidddenListElement = document.getElementById("citydb_hiddenlist");

    emptySelectBox(hidddenListElement, function () {
        var hiddenObjects = webMap.getAllHiddenObjects();
        for (var i = 0; i < hiddenObjects.length; i++) {
            var option = document.createElement("option");
            option.text = hiddenObjects[i];
            hidddenListElement.add(option);
            hidddenListElement.selectedIndex = 0;
        }
    });
}

function emptySelectBox(selectElement, callback) {
    for (var i = selectElement.length - 1; i >= 0; i--) {
        selectElement.remove(1);
    }

    callback();
}

function flyToClickedObject(obj) {
    // The web client stores clicked or ctrlclicked entities in a dictionary clickedEntities with {id, entity} as KVP.
    // The function flyTo from Cesium Viewer will be first employed to fly to the selected entity.
    // NOTE: This flyTo function will fail if the target entity has been unloaded (e.g. user has moved camera away).
    // In this case, the function zoomToObjectById shall be used instead.
    // NOTE: This zoomToObjectById function requires a JSON file containing the IDs and coordinates of objects.
    cesiumViewer.flyTo(clickedEntities[obj.value]).then(function (result) {
        if (!result) {
            zoomToObjectById(obj.value);
        }
    }).otherwise(function (error) {
        zoomToObjectById(obj.value);
    });

    obj.selectedIndex = 0;
}

function saveLayerSettings() {
    var activeLayer = webMap.activeLayer;
    applySaving('url', activeLayer);
    applySaving('name', activeLayer);
    applySaving('layerDataType', activeLayer);
    applySaving('gltfVersion', activeLayer);
    applySaving('thematicDataUrl', activeLayer);
    applySaving('thematicDataSource', activeLayer);
    applySaving('tableType', activeLayer);
    // applySaving('googleSheetsApiKey', activeLayer);
    // applySaving('googleSheetsRanges', activeLayer);
    // applySaving('googleSheetsClientId', activeLayer);
    applySaving('cityobjectsJsonUrl', activeLayer);
    applySaving('minLodPixels', activeLayer);
    applySaving('maxLodPixels', activeLayer);
    applySaving('maxSizeOfCachedTiles', activeLayer);
    applySaving('maxCountOfVisibleTiles', activeLayer);
    console.log(activeLayer);

    // Update Data Source
    thematicDataSourceAndTableTypeDropdownOnchange();

    // update GUI:
    var nodes = document.getElementById('citydb_layerlistpanel').childNodes;
    for (var i = 0; i < nodes.length; i += 3) {
        var layerOption = nodes[i];
        if (layerOption.id == activeLayer.id) {
            layerOption.childNodes[2].innerHTML = activeLayer.name;
        }
    }

    document.getElementById('loadingIndicator').style.display = 'block';
    var promise = activeLayer.reActivate();
    Cesium.when(promise, function (result) {
        document.getElementById('loadingIndicator').style.display = 'none';
    }, function (error) {
        CitydbUtil.showAlertWindow("OK", "Error", error.message);
        document.getElementById('loadingIndicator').style.display = 'none';
    })

    function applySaving(propertyName, activeLayer) {
        var newValue = addLayerViewModel[propertyName];
        if (propertyName === 'maxLodPixels' && newValue == -1) {
            newValue = Number.MAX_VALUE;
        }
        if (Cesium.isArray(newValue)) {
            activeLayer[propertyName] = newValue[0];
        } else {
            activeLayer[propertyName] = newValue;
        }
    }
}

function loadLayerGroup(_layers) {
    if (_layers.length == 0)
        return;

    document.getElementById('loadingIndicator').style.display = 'block';
    _loadLayer(0);

    function _loadLayer(index) {
        var promise = webMap.addLayer(_layers[index]);
        Cesium.when(promise, function (addedLayer) {
            console.log(addedLayer);
            addEventListeners(addedLayer);
            addLayerToList(addedLayer);
            if (index < (_layers.length - 1)) {
                index++;
                _loadLayer(index);
            } else {
                webMap._activeLayer = _layers[0];
                document.getElementById('loadingIndicator').style.display = 'none';

                // show/hide glTF version based on the value of Layer Data Type
                layerDataTypeDropdownOnchange();

                thematicDataSourceAndTableTypeDropdownOnchange();
            }
        }).otherwise(function (error) {
            CitydbUtil.showAlertWindow("OK", "Error", error.message);
            console.log(error.stack);
            document.getElementById('loadingIndicator').style.display = 'none';
        });
    }
}

function addLayerToList(layer) {
    var radio = document.createElement('input');
    radio.type = "radio";
    radio.name = "dummyradio";
    radio.onchange = function (event) {
        var targetRadio = event.target;
        var layerId = targetRadio.parentNode.id;
        webMap.activeLayer = webMap.getLayerbyId(layerId);
        console.log(webMap.activeLayer);
    };

    var checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.id = "id";
    checkbox.checked = layer.active;
    checkbox.onchange = function (event) {
        var checkbox = event.target;
        var layerId = checkbox.parentNode.id;
        var citydbLayer = webMap.getLayerbyId(layerId);
        if (checkbox.checked) {
            console.log("Layer " + citydbLayer.name + " is visible now!");
            citydbLayer.activate(true);
        } else {
            console.log("Layer " + citydbLayer.name + " is not visible now!");
            citydbLayer.activate(false);
        }
    };

    var label = document.createElement('label')
    label.appendChild(document.createTextNode(layer.name));

    var layerOption = document.createElement('div');
    layerOption.id = layer.id;
    layerOption.appendChild(radio);
    layerOption.appendChild(checkbox);
    layerOption.appendChild(label);

    label.ondblclick = function (event) {
        event.preventDefault();
        var layerId = event.target.parentNode.id;
        var citydbLayer = webMap.getLayerbyId(layerId);
        citydbLayer.zoomToStartPosition();
    }

    var layerlistpanel = document.getElementById("citydb_layerlistpanel")
    layerlistpanel.appendChild(layerOption);
}

function addEventListeners(layer) {

    function auxClickEventListener(object) {
        var objectId;
        var targetEntity;
        if (layer instanceof CitydbKmlLayer) {
            targetEntity = object.id;
            objectId = targetEntity.name;
        } else if (layer instanceof Cesium3DTilesDataLayer) {
            console.log(object);
            if (!(object._content instanceof Cesium.Batched3DModel3DTileContent))
                return;

            var featureArray = object._content._features;
            if (!Cesium.defined(featureArray))
                return;
            var objectId = featureArray[object._batchId].getProperty("id");
            if (!Cesium.defined(objectId))
                return;

            targetEntity = new Cesium.Entity({
                id: objectId
            });
            cesiumViewer.selectedEntity = targetEntity;
        }

        // Save this clicked object for later use (such as zooming using ID)
        clickedEntities[objectId] = targetEntity;

        return [objectId, targetEntity];
    }

    layer.registerEventHandler("CLICK", function (object) {
        var res = auxClickEventListener(object);
        createInfoTable(res[0], res[1], layer);
    });

    layer.registerEventHandler("CTRLCLICK", function (object) {
        auxClickEventListener(object);
    });
}

function zoomToDefaultCameraPosition() {
    var deferred = Cesium.when.defer();
    var latitudeStr = CitydbUtil.parse_query_string('latitude', window.location.href);
    var longitudeStr = CitydbUtil.parse_query_string('longitude', window.location.href);
    var heightStr = CitydbUtil.parse_query_string('height', window.location.href);
    var headingStr = CitydbUtil.parse_query_string('heading', window.location.href);
    var pitchStr = CitydbUtil.parse_query_string('pitch', window.location.href);
    var rollStr = CitydbUtil.parse_query_string('roll', window.location.href);

    if (latitudeStr && longitudeStr && heightStr && headingStr && pitchStr && rollStr) {
        var cameraPostion = {
            latitude: parseFloat(latitudeStr),
            longitude: parseFloat(longitudeStr),
            height: parseFloat(heightStr),
            heading: parseFloat(headingStr),
            pitch: parseFloat(pitchStr),
            roll: parseFloat(rollStr)
        }
        return flyToCameraPosition(cameraPostion);
    } else {
        return zoomToDefaultCameraPosition_expired();
    }

    return deferred;
}

function zoomToDefaultCameraPosition_expired() {
    var deferred = Cesium.when.defer();
    var cesiumCamera = cesiumViewer.scene.camera;
    var latstr = CitydbUtil.parse_query_string('lat', window.location.href);
    var lonstr = CitydbUtil.parse_query_string('lon', window.location.href);

    if (latstr && lonstr) {
        var lat = parseFloat(latstr);
        var lon = parseFloat(lonstr);
        var range = 800;
        var heading = 6;
        var tilt = 49;
        var altitude = 40;

        var rangestr = CitydbUtil.parse_query_string('range', window.location.href);
        if (rangestr)
            range = parseFloat(rangestr);

        var headingstr = CitydbUtil.parse_query_string('heading', window.location.href);
        if (headingstr)
            heading = parseFloat(headingstr);

        var tiltstr = CitydbUtil.parse_query_string('tilt', window.location.href);
        if (tiltstr)
            tilt = parseFloat(tiltstr);

        var altitudestr = CitydbUtil.parse_query_string('altitude', window.location.href);
        if (altitudestr)
            altitude = parseFloat(altitudestr);

        var _center = Cesium.Cartesian3.fromDegrees(lon, lat);
        var _heading = Cesium.Math.toRadians(heading);
        var _pitch = Cesium.Math.toRadians(tilt - 90);
        var _range = range;
        cesiumCamera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, _range),
            orientation: {
                heading: _heading,
                pitch: _pitch,
                roll: 0
            },
            complete: function () {
                deferred.resolve("fly to the desired camera position");
            }
        });
    } else {
        // default camera postion
        deferred.resolve("fly to the default camera position");
        ;
    }
    return deferred;
}

function flyToCameraPosition(cameraPosition) {
    var deferred = Cesium.when.defer();
    var cesiumCamera = cesiumViewer.scene.camera;
    var longitude = cameraPosition.longitude;
    var latitude = cameraPosition.latitude;
    var height = cameraPosition.height;
    cesiumCamera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: {
            heading: Cesium.Math.toRadians(cameraPosition.heading),
            pitch: Cesium.Math.toRadians(cameraPosition.pitch),
            roll: Cesium.Math.toRadians(cameraPosition.roll)
        },
        complete: function () {
            deferred.resolve("fly to the desired camera position");
        }
    });
    return deferred;
}

// Creation of a scene link for sharing with other people..
function showSceneLink() {
    var sceneLink = generateLink();
    CitydbUtil.showAlertWindow("OK", "Vy länk", '<a href="' + sceneLink + '" style="color:#c0c0c0" target="_blank">' + sceneLink + '</a>');
}

function generateLink() {
    var cameraPosition = getCurrentCameraPostion();
    var projectLink = location.protocol + '//' + location.host + location.pathname + '?';

    var clock = cesiumViewer.cesiumWidget.clock;
    if (!clock.shouldAnimate) {
        var currentJulianDate = clock.currentTime;
        projectLink = projectLink + Cesium.objectToQuery({ "dayTime": Cesium.JulianDate.toIso8601(currentJulianDate, 0) }) + '&';
    }

    projectLink = projectLink +
        'title=' + document.title +
        '&shadows=' + cesiumViewer.shadows +
        '&terrainShadows=' + (isNaN(cesiumViewer.terrainShadows) ? 0 : cesiumViewer.terrainShadows) +
        '&latitude=' + cameraPosition.latitude +
        '&longitude=' + cameraPosition.longitude +
        '&height=' + cameraPosition.height +
        '&heading=' + cameraPosition.heading +
        '&pitch=' + cameraPosition.pitch +
        '&roll=' + cameraPosition.roll +
        '&' + layersToQuery();
    var basemap = basemapToQuery();
    if (basemap != null) {
        projectLink = projectLink + '&' + basemap;
    }

    // var terrain = terrainToQuery();
    // if (terrain != null) {
    //     projectLink = projectLink + '&' + terrain;
    // }

    var splashWindow = splashWindowToQuery();
    if (splashWindow != null) {
        projectLink = projectLink + '&' + splashWindow;
    }

    return projectLink;
}

function getCurrentCameraPostion() {
    var cesiumCamera = cesiumViewer.scene.camera;
    var position = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cesiumCamera.position);
    var latitude = Cesium.Math.toDegrees(position.latitude);
    var longitude = Cesium.Math.toDegrees(position.longitude);
    var height = position.height;
    var heading = Cesium.Math.toDegrees(cesiumCamera.heading);
    var pitch = Cesium.Math.toDegrees(cesiumCamera.pitch);
    var roll = Cesium.Math.toDegrees(cesiumCamera.roll);
    return {
        latitude: latitude,
        longitude: longitude,
        height: height,
        heading: heading,
        pitch: pitch,
        roll: roll
    }
}

function layersToQuery() {
    var layerGroupObject = new Object();
    var layers = webMap._layers;
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var layerConfig = {
            url: layer.url,
            name: layer.name,
            layerDataType: layer.layerDataType,
            gltfVersion: layer.gltfVersion,
            active: layer.active,
            spreadsheetUrl: layer.thematicDataUrl,
            thematicDataSource: layer.thematicDataSource,
            tableType: layer.tableType,
            // googleSheetsApiKey: layer.googleSheetsApiKey,
            // googleSheetsRanges: layer.googleSheetsRanges,
            // googleSheetsClientId: layer.googleSheetsClientId,
            cityobjectsJsonUrl: layer.cityobjectsJsonUrl,
            minLodPixels: layer.minLodPixels,
            maxLodPixels: layer.maxLodPixels == -1 ? Number.MAX_VALUE : layer.maxLodPixels,
            maxSizeOfCachedTiles: layer.maxSizeOfCachedTiles,
            maxCountOfVisibleTiles: layer.maxCountOfVisibleTiles,
        }
        layerGroupObject["layer_" + i] = Cesium.objectToQuery(layerConfig);
    }

    return Cesium.objectToQuery(layerGroupObject)
}

function basemapToQuery() {
    var baseLayerPickerViewModel = cesiumViewer.baseLayerPicker.viewModel;
    var baseLayerProviderFunc = baseLayerPickerViewModel.selectedImagery.creationCommand();
    if (baseLayerProviderFunc instanceof Cesium.WebMapServiceImageryProvider) {
        return Cesium.objectToQuery({
            basemap: Cesium.objectToQuery(addWmsViewModel)
        });
    } else {
        return null;
    }
}

function terrainToQuery() {
    var baseLayerPickerViewModel = cesiumViewer.baseLayerPicker.viewModel;
    var baseLayerProviderFunc = baseLayerPickerViewModel.selectedTerrain.creationCommand();
    if (baseLayerProviderFunc instanceof Cesium.CesiumTerrainProvider) {
        if (baseLayerPickerViewModel.selectedTerrain.name.indexOf("Cesium World Terrain") !== -1) {
            return "cesiumWorldTerrain=true";
        }
        return Cesium.objectToQuery({
            terrain: Cesium.objectToQuery(addTerrainViewModel)
        });
    } else {
        return null;
    }
}

function splashWindowToQuery() {
    if (addSplashWindowModel.url) {
        return Cesium.objectToQuery({
            splashWindow: Cesium.objectToQuery(addSplashWindowModel)
        });
    }
    return null;
}

// Clear Highlighting effect of all highlighted objects
function clearhighlight() {
    var layers = webMap._layers;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].active) {
            layers[i].unHighlightAllObjects();
        }
    }
    cesiumViewer.selectedEntity = undefined;
}
;

// hide the selected objects
function hideSelectedObjects() {
    var layers = webMap._layers;
    var objectIds;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].active) {
            objectIds = Object.keys(layers[i].highlightedObjects);
            layers[i].hideObjects(objectIds);
        }
    }
}
;

// show the hidden objects
function showHiddenObjects() {
    var layers = webMap._layers;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].active) {
            layers[i].showAllObjects();
        }
    }
}
;

function zoomToObjectById(gmlId, callBackFunc, errorCallbackFunc) {
    gmlId = gmlId.trim();
    var activeLayer = webMap._activeLayer;
    if (Cesium.defined(activeLayer)) {
        var cityobjectsJsonData = activeLayer.cityobjectsJsonData;
        if (!cityobjectsJsonData) {
            if (Cesium.defined(errorCallbackFunc)) {
                errorCallbackFunc.call(this);
            }
        } else {
            var obj = cityobjectsJsonData[gmlId];
        }
        if (obj) {
            var lon = (obj.envelope[0] + obj.envelope[2]) / 2.0;
            var lat = (obj.envelope[1] + obj.envelope[3]) / 2.0;
            flyToMapLocation(lat, lon, callBackFunc);
        } else {
            // TODO
            var thematicDataUrl = webMap.activeLayer.thematicDataUrl;
            webmap._activeLayer.dataSourceController.fetchData(gmlId, function (result) {
                if (!result) {
                    if (Cesium.defined(errorCallbackFunc)) {
                        errorCallbackFunc.call(this);
                    }
                } else {
                    var centroid = result["CENTROID"];
                    if (centroid) {
                        var res = centroid.match(/\(([^)]+)\)/)[1].split(",");
                        var lon = parseFloat(res[0]);
                        var lat = parseFloat(res[1]);
                        flyToMapLocation(lat, lon, callBackFunc);
                    } else {
                        if (Cesium.defined(errorCallbackFunc)) {
                            errorCallbackFunc.call(this);
                        }
                    }
                }
            }, 1000);

            // var promise = fetchDataFromGoogleFusionTable(gmlId, thematicDataUrl);
            // Cesium.when(promise, function (result) {
            //     var centroid = result["CENTROID"];
            //     if (centroid) {
            //         var res = centroid.match(/\(([^)]+)\)/)[1].split(",");
            //         var lon = parseFloat(res[0]);
            //         var lat = parseFloat(res[1]);
            //         flyToMapLocation(lat, lon, callBackFunc);
            //     } else {
            //         if (Cesium.defined(errorCallbackFunc)) {
            //             errorCallbackFunc.call(this);
            //         }
            //     }
            // }, function () {
            //     if (Cesium.defined(errorCallbackFunc)) {
            //         errorCallbackFunc.call(this);
            //     }
            // });
        }
    } else {
        if (Cesium.defined(errorCallbackFunc)) {
            errorCallbackFunc.call(this);
        }
    }
}
;

function flyToMapLocation(lat, lon, callBackFunc) {
    var cesiumWidget = webMap._cesiumViewerInstance.cesiumWidget;
    var scene = cesiumWidget.scene;
    var camera = scene.camera;
    var canvas = scene.canvas;
    var globe = scene.globe;
    var clientWidth = canvas.clientWidth;
    var clientHeight = canvas.clientHeight;
    camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 2000),
        complete: function () {
            var intersectedPoint = globe.pick(camera.getPickRay(new Cesium.Cartesian2(clientWidth / 2, clientHeight / 2)), scene);
            var terrainHeight = Cesium.Ellipsoid.WGS84.cartesianToCartographic(intersectedPoint).height;
            var center = Cesium.Cartesian3.fromDegrees(lon, lat, terrainHeight);
            var heading = Cesium.Math.toRadians(0);
            var pitch = Cesium.Math.toRadians(-50);
            var range = 100;
            camera.lookAt(center, new Cesium.HeadingPitchRange(heading, pitch, range));
            camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            if (Cesium.defined(callBackFunc)) {
                callBackFunc.call(this);
            }
        }
    })
}

function addNewLayer() {
    var _layers = new Array();
    var options = {
        url: addLayerViewModel.url.trim(),
        name: addLayerViewModel.name.trim(),
        layerDataType: addLayerViewModel.layerDataType.trim(),
        gltfVersion: addLayerViewModel.gltfVersion.trim(),
        thematicDataUrl: addLayerViewModel.thematicDataUrl.trim(),
        thematicDataSource: addLayerViewModel.thematicDataSource.trim(),
        tableType: addLayerViewModel.tableType.trim(),
        // googleSheetsApiKey: addLayerViewModel.googleSheetsApiKey.trim(),
        // googleSheetsRanges: addLayerViewModel.googleSheetsRanges.trim(),
        // googleSheetsClientId: addLayerViewModel.googleSheetsClientId.trim(),
        cityobjectsJsonUrl: addLayerViewModel.cityobjectsJsonUrl.trim(),
        minLodPixels: addLayerViewModel.minLodPixels,
        maxLodPixels: addLayerViewModel.maxLodPixels == -1 ? Number.MAX_VALUE : addLayerViewModel.maxLodPixels,
        maxSizeOfCachedTiles: addLayerViewModel.maxSizeOfCachedTiles,
        maxCountOfVisibleTiles: addLayerViewModel.maxCountOfVisibleTiles
    }

    // since Cesium 3D Tiles also require name.json in the URL, it must be checked first
    var layerDataTypeDropdown = document.getElementById("layerDataTypeDropdown");
    if (layerDataTypeDropdown.options[layerDataTypeDropdown.selectedIndex].value === 'Cesium 3D Tiles') {
        _layers.push(new Cesium3DTilesDataLayer(options));
    } else if (['kml', 'kmz', 'json', 'czml'].indexOf(CitydbUtil.get_suffix_from_filename(options.url)) > -1) {
        _layers.push(new CitydbKmlLayer(options));
    }

    loadLayerGroup(_layers);
}

function removeSelectedLayer() {
    var layer = webMap.activeLayer;
    if (Cesium.defined(layer)) {
        var layerId = layer.id;
        document.getElementById(layerId).remove();
        webMap.removeLayer(layerId);
        // update active layer of the globe webMap
        var webMapLayers = webMap._layers;
        if (webMapLayers.length > 0) {
            webMap.activeLayer = webMapLayers[0];
        } else {
            webMap.activeLayer = undefined;
        }
    }
}

function addWebMapServiceProvider() {
    var baseLayerPickerViewModel = cesiumViewer.baseLayerPicker.viewModel;
    var wmsProviderViewModel = new Cesium.ProviderViewModel({
        name: addWmsViewModel.name.trim(),
        iconUrl: addWmsViewModel.iconUrl.trim(),
        tooltip: addWmsViewModel.tooltip.trim(),
        creationFunction: function () {
            return new Cesium.WebMapServiceImageryProvider({
                url: new Cesium.Resource({ url: addWmsViewModel.url.trim(), proxy: addWmsViewModel.proxyUrl.trim().length == 0 ? null : new Cesium.DefaultProxy(addWmsViewModel.proxyUrl.trim()) }),
                layers: addWmsViewModel.layers.trim(),
                parameters: Cesium.queryToObject(addWmsViewModel.additionalParameters.trim())
            });
        }
    });
    baseLayerPickerViewModel.imageryProviderViewModels.push(wmsProviderViewModel);
    baseLayerPickerViewModel.selectedImagery = wmsProviderViewModel;
}

function removeImageryProvider() {
    var baseLayerPickerViewModel = cesiumViewer.baseLayerPicker.viewModel;
    var selectedImagery = baseLayerPickerViewModel.selectedImagery;
    baseLayerPickerViewModel.imageryProviderViewModels.remove(selectedImagery);
    baseLayerPickerViewModel.selectedImagery = baseLayerPickerViewModel.imageryProviderViewModels[0];
}

function addTerrainProvider() {
    var baseLayerPickerViewModel = cesiumViewer.baseLayerPicker.viewModel;
    var demProviderViewModel = new Cesium.ProviderViewModel({
        name: addTerrainViewModel.name.trim(),
        iconUrl: addTerrainViewModel.iconUrl.trim(),
        tooltip: addTerrainViewModel.tooltip.trim(),
        creationFunction: function () {
            return new Cesium.CesiumTerrainProvider({
                url: addTerrainViewModel.url.trim()
            });
        }
    })
    baseLayerPickerViewModel.terrainProviderViewModels.push(demProviderViewModel);
    baseLayerPickerViewModel.selectedTerrain = demProviderViewModel;
}

function removeTerrainProvider() {
    var baseLayerPickerViewModel = cesiumViewer.baseLayerPicker.viewModel;
    var selectedTerrain = baseLayerPickerViewModel.selectedTerrain;
    baseLayerPickerViewModel.terrainProviderViewModels.remove(selectedTerrain);
    baseLayerPickerViewModel.selectedTerrain = baseLayerPickerViewModel.terrainProviderViewModels[0];
}

// Source: https://stackoverflow.com/questions/4825683/how-do-i-create-and-read-a-value-from-cookie
function createCookie(name, value, days) {
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    }
    else {
        expires = "";
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}

function getCookie(c_name) {
    if (document.cookie.length > 0) {
        c_start = document.cookie.indexOf(c_name + "=");
        if (c_start != -1) {
            c_start = c_start + c_name.length + 1;
            c_end = document.cookie.indexOf(";", c_start);
            if (c_end == -1) {
                c_end = document.cookie.length;
            }
            return unescape(document.cookie.substring(c_start, c_end));
        }
    }
    return "";
}

function setCookie(c_name, value) {
    createCookie(c_name, value);
}

function createScreenshot() {
    cesiumViewer.render();
    var imageUri = cesiumViewer.canvas.toDataURL();
    var imageWin = window.open("");
    imageWin.document.write("<html><head>" +
        "<title>" + imageUri + "</title></head><body>" +
        '<img src="' + imageUri + '"width="100%">' +
        "</body></html>");
    return imageWin;
}

function printCurrentview() {
    var imageWin = createScreenshot();
    imageWin.document.close();
    imageWin.focus();
    imageWin.print();
    imageWin.close();
}

function toggleShadows() {
    cesiumViewer.shadows = !cesiumViewer.shadows;
    if (!cesiumViewer.shadows) {
        cesiumViewer.terrainShadows = Cesium.ShadowMode.ENABLED;
    }
}

function toggleTerrainShadows() {
    if (cesiumViewer.terrainShadows == Cesium.ShadowMode.ENABLED) {
        cesiumViewer.terrainShadows = Cesium.ShadowMode.DISABLED;
    } else {
        cesiumViewer.terrainShadows = Cesium.ShadowMode.ENABLED;
        if (!cesiumViewer.shadows) {
            // CitydbUtil.showAlertWindow("OK", "Switching on terrain shadows now", 'Please note that shadows for 3D models will also be switched on.',
            //     function () {
                    toggleShadows();
                // });
        }
    }
}

function createInfoTable(gmlid, cesiumEntity, citydbLayer) {
    var thematicDataUrl = citydbLayer.thematicDataUrl;
    cesiumEntity.description = "Hämtar objektinformation...";

    citydbLayer.dataSourceController.fetchData(gmlid, function (kvp) {
        if (!kvp) {
            cesiumEntity.description = 'Ingen information funnen';
        } else {
            var html = '<table class="cesium-infoBox-defaultTable" style="font-size:10.5pt"><tbody>';
            for (var key in kvp) {
                if (typeof kvp[key] !== 'object') {
                    html += '<tr><td>' + key.toUpperCase() + '</td><td style="width:50%">' + kvp[key] + '</td></tr>';
                }
                if (Array.isArray(kvp[key])) {
                    kvp[key].forEach(el => {
                        var elArray = Object.entries(el)
                        html += '<table class="cesium-infoBox-defaultTable" style="font-size:10.5pt"><tbody>';
                        html += '<th style="width:50%">' + key.toUpperCase(); + '</th>';
                        elArray.forEach(arr => {
                            html += '<tr><td>' + Object.values(arr)[0] + '</td><td style="width:50%">' + Object.values(arr)[1] + '</td></tr>';
                        });
                        html += '</tbody></table>';
                    });
                } else if (typeof kvp[key] === 'object') {
                    var elArray = Object.entries(kvp[key])
                    html += '<table class="cesium-infoBox-defaultTable" style="font-size:10.5pt"><tbody>';
                    html += '<th style="width:50%">' + key.toUpperCase(); + '</th>';
                    elArray.forEach(arr => {
                        html += '<tr><td>' + Object.values(arr)[0] + '</td><td style="width:50%">' + Object.values(arr)[1] + '</td></tr>';
                    });
                    html += '</tbody></table>';
                }
            }
            html += '</tbody></table>';

            cesiumEntity.description = html;
        }
    }, 1000);

    // fetchDataFromGoogleFusionTable(gmlid, thematicDataUrl).then(function (kvp) {
    //     console.log(kvp);
    //     var html = '<table class="cesium-infoBox-defaultTable" style="font-size:10.5pt"><tbody>';
    //     for (var key in kvp) {
    //         html += '<tr><td>' + key + '</td><td>' + kvp[key] + '</td></tr>';
    //     }
    //     html += '</tbody></table>';
    //
    //     cesiumEntity.description = html;
    // }).otherwise(function (error) {
    //     cesiumEntity.description = 'No feature information found';
    // });
}

function fetchDataFromGoogleSpreadsheet(gmlid, thematicDataUrl) {
    var kvp = {};
    var deferred = Cesium.when.defer();

    var spreadsheetKey = thematicDataUrl.split("/")[5];
    var metaLink = 'https://spreadsheets.google.com/feeds/worksheets/' + spreadsheetKey + '/public/full?alt=json-in-script';

    Cesium.jsonp(metaLink).then(function (meta) {
        console.log(meta);
        var feedCellUrl = meta.feed.entry[0].link[1].href;
        feedCellUrl += '?alt=json-in-script&min-row=1&max-row=1';
        Cesium.jsonp(feedCellUrl).then(function (cellData) {
            var feedListUrl = meta.feed.entry[0].link[0].href;
            feedListUrl += '?alt=json-in-script&sq=gmlid%3D';
            feedListUrl += gmlid;
            Cesium.jsonp(feedListUrl).then(function (listData) {
                for (var i = 1; i < cellData.feed.entry.length; i++) {
                    var key = cellData.feed.entry[i].content.$t;
                    var value = listData.feed.entry[0]['gsx$' + key.toLowerCase().replace(/_/g, '')].$t;
                    kvp[key] = value;
                }
                deferred.resolve(kvp);
            }).otherwise(function (error) {
                deferred.reject(error);
            });
        }).otherwise(function (error) {
            deferred.reject(error);
        });
    }).otherwise(function (error) {
        deferred.reject(error);
    });

    return deferred.promise;
}

function fetchDataFromGoogleFusionTable(gmlid, thematicDataUrl) {
    var kvp = {};
    var deferred = Cesium.when.defer();

    var tableID = CitydbUtil.parse_query_string('docid', thematicDataUrl);
    var sql = "SELECT * FROM " + tableID + " WHERE GMLID = '" + gmlid + "'";
    var apiKey = "AIzaSyAm9yWCV7JPCTHCJut8whOjARd7pwROFDQ";
    var queryLink = "https://www.googleapis.com/fusiontables/v2/query";
    new Cesium.Resource({ url: queryLink, queryParameters: { sql: sql, key: apiKey } }).fetch({ responseType: 'json' }).then(function (data) {
        console.log(data);
        var columns = data.columns;
        var rows = data.rows;
        for (var i = 0; i < columns.length; i++) {
            var key = columns[i];
            var value = rows[0][i];
            kvp[key] = value;
        }
        console.log(kvp);
        deferred.resolve(kvp);
    }).otherwise(function (error) {
        deferred.reject(error);
    });
    return deferred.promise;
}


function showInExternalMaps() {
    // var mapOptionList = document.getElementById('citydb_showinexternalmaps');
    // var selectedIndex = mapOptionList.selectedIndex;
    // mapOptionList.selectedIndex = 0;

    var selectedEntity = cesiumViewer.selectedEntity;
    if (!Cesium.defined(selectedEntity)) {
        CitydbUtil.showAlertWindow("OK", "Välj ett objekt", 'Välj ett objekt för att öppna plats i Strängnäskartan.');
        return;
    }

    var selectedEntityPosition = selectedEntity.position;
    var wgs84OCoordinate;

    if (!Cesium.defined(selectedEntityPosition)) {
        var boundingSphereScratch = new Cesium.BoundingSphere();
        cesiumViewer._dataSourceDisplay.getBoundingSphere(selectedEntity, false, boundingSphereScratch);
        wgs84OCoordinate = Cesium.Ellipsoid.WGS84.cartesianToCartographic(boundingSphereScratch.center);
    } else {
        wgs84OCoordinate = Cesium.Ellipsoid.WGS84.cartesianToCartographic(selectedEntityPosition._value);

    }
    var lat = Cesium.Math.toDegrees(wgs84OCoordinate.latitude);
    var lon = Cesium.Math.toDegrees(wgs84OCoordinate.longitude);

    // Use Proj4js to reproject native WGS84 to, in this case, SWEREF99 1630
    var epsg3010 = '+proj=tmerc +lat_0=0 +lon_0=16.5 +k=1 +x_0=150000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    var centerCoords = proj4(epsg3010, [lon, lat]);

    // Go directly to Strängnäskartan
    var mapLink = 'https://kartor.strangnas.se/extern/#layers=orto025/v/1/s/0,mask_strangnas/v/1/s/0&center=' + centerCoords + '&zoom=12&map=extern';

    // switch (selectedIndex) {
    //     case 1:
    //         //mapLink = 'https://www.mapchannels.com/dualmaps7/map.htm?lat=' + lat + '&lng=' + lon + '&z=18&slat=' + lat + '&slng=' + lon + '&sh=-150.75&sp=-0.897&sz=1&gm=0&bm=2&panel=s&mi=1&md=0';
    //         //mapLink = 'https://www.google.com/maps/embed/v1/streetview?location=' + lat + ',' + lon + '&key=' + 'AIzaSyBRXHXasDb8PGOXCfQP7r7xQiAQXo3eIQs';
    //         //mapLink = 'https://maps.googleapis.com/maps/api/streetview?size=400x400&location=' + lat + ',' + lon + '&fov=90&heading=235&pitch=10' + '&key=AIzaSyBRXHXasDb8PGOXCfQP7r7xQiAQXo3eIQs';
    //         mapLink = 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + lat + ',' + lon;
    //         break;
    //     case 2:
    //         mapLink = 'https://www.openstreetmap.org/index.html?lat=' + lat + '&lon=' + lon + '&zoom=20';
    //         break;
    //     case 3:
    //         mapLink = 'https://www.bing.com/maps/default.aspx?v=2&cp=' + lat + '~' + lon + '&lvl=19&style=o';
    //         break;
    //     case 4:
    //         mapLink = 'https://www.mapchannels.com/dualmaps7/map.htm?x=' + lon + '&y=' + lat + '&z=16&gm=0&ve=4&gc=0&bz=0&bd=0&mw=1&sv=1&sva=1&svb=0&svp=0&svz=0&svm=2&svf=0&sve=1';
    //         break;
    //     default:
    //     //	do nothing...
    // }

    window.open(mapLink, "_self");
}

function layerDataTypeDropdownOnchange() {
    var layerDataTypeDropdown = document.getElementById("layerDataTypeDropdown");
    if (layerDataTypeDropdown.options[layerDataTypeDropdown.selectedIndex].value !== "COLLADA/KML/glTF") {
        document.getElementById("gltfVersionDropdownRow").style.display = "none";
    } else {
        document.getElementById("gltfVersionDropdownRow").style.display = "";
    }
    addLayerViewModel["layerDataType"] = layerDataTypeDropdown.options[layerDataTypeDropdown.selectedIndex].value;
}

function thematicDataSourceAndTableTypeDropdownOnchange() {
    var thematicDataSourceDropdown = document.getElementById("thematicDataSourceDropdown");
    var selectedThematicDataSource = thematicDataSourceDropdown.options[thematicDataSourceDropdown.selectedIndex].value;

    var tableTypeDropdown = document.getElementById("tableTypeDropdown");
    var selectedTableType = tableTypeDropdown.options[tableTypeDropdown.selectedIndex].value;

    addLayerViewModel["thematicDataSource"] = selectedThematicDataSource;
    addLayerViewModel["tableType"] = selectedTableType;

    // if (selectedThematicDataSource == "GoogleSheets") {
    //     document.getElementById("rowGoogleSheetsApiKey").style.display = "table-row";
    //     document.getElementById("rowGoogleSheetsRanges").style.display = "table-row";
    //     document.getElementById("rowGoogleSheetsClientId").style.display = "table-row";
    // } else {
    //     document.getElementById("rowGoogleSheetsApiKey").style.display = "none";
    //     document.getElementById("rowGoogleSheetsRanges").style.display = "none";
    //     document.getElementById("rowGoogleSheetsClientId").style.display = "none";
    // }

    var options = {
        // name: "",
        // type: "",
        // provider: "",
        uri: addLayerViewModel.thematicDataUrl,
        tableType: selectedTableType,
        // ranges: addLayerViewModel.googleSheetsRanges,
        // apiKey: addLayerViewModel.googleSheetsApiKey,
        // clientId: addLayerViewModel.googleSheetsClientId
    };
    // Mashup Data Source Service
    if (webMap && webMap._activeLayer) {
        webMap._activeLayer.dataSourceController = new DataSourceController(selectedThematicDataSource, options);
    }
}

// Mobile layouts and functionalities
var mobileController = new MobileController();


var userAgentString = navigator.userAgent;
var IExplorerAgent = userAgentString.indexOf("MSIE") > -1 || userAgentString.indexOf("rv:") > -1;
if (IExplorerAgent) {
    CitydbUtil.showAlertWindow("OK", "Kompatibel webbläsare", 'Applikationen stöder inte webbläsaren Internet Explorer, för bästa upplevelse rekommenderas Chrome.');
}

// // Layers panel
// var imageryLayers = cesiumViewer.imageryLayers;

// var viewModel = {
//     layers: [],
//     baseLayers: [],
//     upLayer: null,
//     downLayer: null,
//     selectedLayer: null,
//     isSelectableLayer: function (layer) {
//         return this.baseLayers.indexOf(layer) >= 0;
//     },
//     raise: function (layer, index) {
//         imageryLayers.raise(layer);
//         viewModel.upLayer = layer;
//         viewModel.downLayer = viewModel.layers[Math.max(0, index - 1)];
//         updateLayerList();
//         window.setTimeout(function () { viewModel.upLayer = viewModel.downLayer = null; }, 10);
//     },
//     lower: function (layer, index) {
//         imageryLayers.lower(layer);
//         viewModel.upLayer = viewModel.layers[Math.min(viewModel.layers.length - 1, index + 1)];
//         viewModel.downLayer = layer;
//         updateLayerList();
//         window.setTimeout(function () { viewModel.upLayer = viewModel.downLayer = null; }, 10);
//     },
//     canRaise: function (layerIndex) {
//         return layerIndex > 0;
//     },
//     canLower: function (layerIndex) {
//         return layerIndex >= 0 && layerIndex < imageryLayers.length - 1;
//     }
// };

// var baseLayers = viewModel.baseLayers;

// Cesium.knockout.track(viewModel);

// var gridOptions = {
//     cells: 8,
//     color: Cesium.Color.BLACK,
//     backgroundColor: Cesium.Color.TRANSPARENT,
//     glowColor: Cesium.Color.TRANSPARENT
// }
// var byggnaderOptions = {
//     url: 'https://karta.strangnas.se/geoserver/strangnas/wms',
//     layers: 'byggnader_2017_20190619',
//     parameters: {
//         transparent: 'true',
//         format: 'image/png'
//     },
// }

// function setupLayers() {
//     addBaseLayerOption(
//         'Bakgrundskarta');
//     addAdditionalLayerOption(
//         'Grid',
//         new Cesium.GridImageryProvider(gridOptions), 1.0, false);
//     // addAdditionalLayerOption(
//     //     'Byggnader',
//     //     new Cesium.WebMapServiceImageryProvider(byggnaderOptions), 1.0, false);
// }

// function addBaseLayerOption(name, imageryProvider) {
//     var layer;
//     if (typeof imageryProvider === 'undefined') {
//         layer = imageryLayers.get(0);
//         viewModel.selectedLayer = layer;
//     } else {
//         layer = new Cesium.ImageryLayer(imageryProvider);
//     }

//     layer.name = name;
//     baseLayers.push(layer);
// }

// function addAdditionalLayerOption(name, imageryProvider, alpha, show) {
//     var layer = imageryLayers.addImageryProvider(imageryProvider);
//     layer.alpha = Cesium.defaultValue(alpha, 1);
//     layer.show = Cesium.defaultValue(show, true);
//     layer.name = name;
//     Cesium.knockout.track(layer, ['alpha', 'show', 'name']);
// }

// function updateLayerList() {
//     var numLayers = imageryLayers.length;
//     viewModel.layers.splice(0, viewModel.layers.length);
//     for (var i = numLayers - 1; i >= 0; --i) {
//         viewModel.layers.push(imageryLayers.get(i));
//     }
// }

// setupLayers();
// updateLayerList();

// //Bind the viewModel to the DOM elements of the UI that call for it.
// var toolbar = document.getElementById('toolbar');
// Cesium.knockout.applyBindings(viewModel, toolbar);

// Cesium.knockout.getObservable(viewModel, 'selectedLayer').subscribe(function (baseLayer) {
//     // Handle changes to the drop-down base layer selector.
//     var activeLayerIndex = 0;
//     var numLayers = viewModel.layers.length;
//     for (var i = 0; i < numLayers; ++i) {
//         if (viewModel.isSelectableLayer(viewModel.layers[i])) {
//             activeLayerIndex = i;
//             break;
//         }
//     }
//     var activeLayer = viewModel.layers[activeLayerIndex];
//     var show = activeLayer.show;
//     var alpha = activeLayer.alpha;
//     imageryLayers.remove(activeLayer, false);
//     imageryLayers.add(baseLayer, numLayers - activeLayerIndex - 1);
//     baseLayer.show = show;
//     baseLayer.alpha = alpha;
//     updateLayerList();
// });
