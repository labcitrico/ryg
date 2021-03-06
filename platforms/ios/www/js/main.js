/**********************************************
 * VARIABLE SERVER GUARDA LA URL DEL SERVIDOR *
 **********************************************/
/**** API ****/
//var server = "https://www.bitfarm.mx/kronos_dev/api/v1/"; //Servidor de Pruebas
//var server = "https://www.bitfarm.mx/kronos_qa/api/v1/"; //Servidor QA
var server = "https://kronos.rygespinosa.com.mx/api/v1/"; // Servidor Produccion

/**** WEB ****/
//var SERVIDOR_WEB = "https://www.bitfarm.mx/kronos_qa/movil/" // Servidor web QA
var SERVIDOR_WEB = "https://kronos.rygespinosa.com.mx/movil/" // Servidor web Produccion

/**** DOCUMENTOS ****/
//var SERVIDOR_DOCUMENTOS = "https://www.bitfarm.mx/kronos_qa/documentos/"; // Servidor documentos QA
var SERVIDOR_DOCUMENTOS = "https://kronos.rygespinosa.com.mx/documentos/"; // Servidor documentos Produccion

var mainLog = getLogger('main');
mainLog.info('Apuntando al servidor:' + server);
var db = null;
var internetStatus;
var currentPage;
var syncData = false;
var intervaloPeticiones;

var Directorios = {
    obtenerRaiz() {
        if (device.platform == 'iOS') {
            return cordova.file.dataDirectory; // ios
        }
        return cordova.file.externalApplicationStorageDirectory; // android
    },

    obtenerDirectorio(nombre) {
        return new Promise((resolve, reject) => {
            var type = LocalFileSystem.PERSISTENT;
            window.resolveLocalFileSystemURL(this.obtenerRaiz(), fs => {
                fs.getDirectory(nombre, { create: true }, function (dir) {
                        resolve(dir)
                    }, reject);
            }, reject);
        });
    },

    copiarArchivo(fileEntry, directorio, nombre) {
        return new Promise((resolve, reject) => fileEntry.copyTo(directorio, nombre, resolve, reject));
    },

    obtenerArchivo(nativeURL) {
        return new Promise((resolve, reject) => {
            window.resolveLocalFileSystemURI(nativeURL, resolve, reject)
        });
    },

    obtenerNuevoNombreInput(inputHTMLElement) {
        return new Promise((resolve, reject) => {
            var randomPrefix = Math.random().toString(36).slice(-5);
            var fullPath = inputHTMLElement.value;
            var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\')  : fullPath.lastIndexOf('/'));
            var filename = fullPath.substring(startIndex);
            if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
                filename = filename.substring(1);
            }
            filename = filename.replace(' ', '')
            resolve(randomPrefix + filename);
        });
      },
      
    
    obtenerDirectorioDesdeRaiz: (nombre) => new Promise((resolve, reject) => {
        var type = LocalFileSystem.PERSISTENT;  
        window.requestFileSystem(type, 0, function (fs) {
            fs.root.getDirectory(nombre, { create: true }, function (dir) {
                    resolve(dir)
                }, reject);
        }, reject);
    }),

    obtenerDirectorioGasto() {
        return this.obtenerDirectorio('EspinosaDocs')
            .then(() => this.obtenerDirectorio('EspinosaDocs/Gastos'))
    },

    obtenerDirectorioGastoTemporal() {
        return this.obtenerDirectorio('EspinosaDocs')
            .then(() => this.obtenerDirectorio('EspinosaDocs/GastosTemporal'))
    },

    obtenerDirectorioDescargas() {
        return this.obtenerDirectorioDesdeRaiz('Download');
    },

    obtenerDirectorioEspinosaDocs() {
        return this.obtenerDirectorio('EspinosaDocs');
    },
    
    obtenerDirectorioEspinosaPhotos(numeroSiniestro) {
        return this.obtenerDirectorio('EspinosaPhotos')
            .then(() => this.obtenerDirectorio(`EspinosaPhotos/${numeroSiniestro}`))
    },

    /**
     * Funcion para obtener blob de input
     * @param {HTMLInputElement} input 
     * @returns {Promise<Blob>}
     */
    obtenerBlobInput(input) {
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = () => {
                resolve(new Blob([reader.result], {type: input.files[0].type}))
            }
            reader.onerror = reject;
            reader.readAsArrayBuffer(input.files[0]);
        })
    },

    /**
     * Funcion para obtener blob de un archivo
     * @param {string} fileURL
     * @returns {Promise<Blob>}
     */
    obtenerBlobArchivo(fileURL) {
        return new Promise((resolve, reject) => {
            window.resolveLocalFileSystemURL(fileURL, function(fileObj){
                fileObj.file(function (file) {
                    var reader = new FileReader();
                    reader.onloadend = function(evt) {
                        var pdfBase64 = evt.target.result;
                        pdfBase64 = pdfBase64.split(",")[1];
                        resolve(b64toBlob(pdfBase64, file.type));
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }, reject);
            }, reject);
        })
    },

    /**
     * Funcion para obtener el b64
     * @param {string} fileURL
     * @returns {Promise<string>}
     */
    obtenerBase64Archivo(fileURL) {
        return new Promise((resolve, reject) => {
            console.error('cargando archvio', fileURL)
            window.resolveLocalFileSystemURL(fileURL, function(fileObj){
                fileObj.file(function (file) {
                    console.error('cargado archvio', fileURL)
                    var reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }, reject);
            }, reject);
        })
    },

    existeArchivo(nativeURL) {
        return new Promise((resolve, reject) => {
            window.resolveLocalFileSystemURL(nativeURL, () => resolve(true), () => resolve(false));
        });
    },
    
    guardarArchivo(directorioURLnativa, filename, blob) {
        return new Promise((resolve, reject) => {
            window.resolveLocalFileSystemURL(directorioURLnativa, function (dir) {
                dir.getFile(filename, {
                    create: true
                }, function (file) {
                    file.createWriter(function (fileWriter) {
                        fileWriter.seek(0);
                        fileWriter.onwriteend = () => resolve(file);
                        fileWriter.onerror = error => reject(error);
                        fileWriter.write(blob);
                    }, reject);
                }, reject);
            }, reject);
        })
    }


}

document.addEventListener("deviceready", onDeviceReady, false); 

function onDeviceReady(){
    db = window.sqlitePlugin.openDatabase({
      name: 'kronos.db',
      location: 'default',
      androidDatabaseProvider: 'system'
    });
    document.dispatchEvent(new Event("databaseready"));
    setSynced();
    createDatabase()
        .then(getCatalogosVersion);
    $.support.cors = true;
    $.mobile.allowCrossDomainPages = true;
    $.mobile.ignoreContentEnabled = true;
    intervaloPeticiones = crearIntervaloPeticiones();
    // pedir permisos
    cordova.plugins.diagnostic.requestCameraAuthorization(
        function(status) {
            let estado = status == cordova.plugins.diagnostic.permissionStatus.GRANTED ? "granted" : "denied";
            mainLog.debug("Authorization request for camera use was " + estado);
            if (status == 'denied') {
                showError('No se pudo obtener acceso a la camara');    
            }
        }, function(error){
            showError('No se pudo obtener acceso a la camara');
            mainLog.error("The following error occurred: "+ error);
        }, false
    );
}

function crearIntervaloPeticiones() {
    console.error('CREANDO INTERVALO');
    return window.setInterval(function () {
        //Se revisa si tiene conexi??n a internet
        if (verificarConexion()) {
            //Se obtiene el token
            var tokenSaved = window.localStorage.getItem("tokenLogin");
            //Revisa que exista un token almacenado
            if (tokenSaved != null && tokenSaved != undefined) {
                //Env??a las peticiones
                if (!sincronizando) {
                    syncLocalData('sync');
                }
            }
        }
    }, 12000);
}

/****************************************************************************
 * FUNCI??N QUE SE ENCARGA DE OBTENER LOS PARAMETROS A TRAV??S DEL METODO GET *
 ****************************************************************************/
function sendGetRequest(url, successHandler, errorHandler, async, dataType) {
    sendRequest('get', url, null, successHandler, errorHandler, async, dataType);
}

/****************************************************************************
 * FUNCI??N QUE SE ENCARGA DE MANDAR LOS PARAMETROS A TRAV??S DEL METODO POST *
 ****************************************************************************/
function sendPostRequest(url, dataParam, successHandler, errorHandler, async) {
    sendRequest('post', url, dataParam, successHandler, errorHandler, async);
}

function sendRequest(type, url, dataParam, successHandler, errorHandler, async, dataType) {
    $.support.cors = true;
    if (!dataType) {
        dataType = 'json';
    }
    if (async ===undefined) {
        async = true;
    }

    var tokenSaved = window.localStorage.getItem("tokenLogin");
    mainLog.trace(`${type.toString().toUpperCase()} ${server + url} type:${dataType} body:`, dataParam);
    if (tokenSaved == undefined || tokenSaved == null) {
        showLoading();
        $.ajax({
            type: type,
            url: server + url,
            dataType: dataType,
            data: dataParam,
            async: async,
            crossDomain: true,
            isLocal: false,
            timeout: 120000,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"
            },
            contentType: 'application/x-www-form-urlencoded; charset=utf-8',
            success: function (data) {
                mainLog.trace(`${type.toString().toUpperCase()} ${server + url} response:`, data);
                successHandler(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                mainLog.error(`${type.toString().toUpperCase()} ${server + url} response:`, {jqXHR, textStatus, errorThrown});
                /* alert(JSON.stringify(jqXHR) + " " + textStatus + " " + errorThrown); */
                httpErrorHandler(jqXHR, textStatus, errorThrown);
                if (errorHandler != null) {
                    errorHandler(jqXHR, textStatus, errorThrown);
                }
            }
        }).always(function () {
            hideLoading();
        });
    } else {
        showLoading();
        var token = window.localStorage.getItem("tokenLogin");
        $.ajax({
            type: type,
            url: server + url,
            dataType: dataType,
            data: dataParam,
            async: async,
            crossDomain: true,
            isLocal: false,
            timeout: 120000,
            headers: {
                Authorization: "Bearer " +
                    window.localStorage.getItem("tokenLogin")
            },
            contentType: 'application/x-www-form-urlencoded; charset=utf-8',
            success: function (data) {
                mainLog.trace(`${type.toUpperCase()} ${server + url} response:`, data)
                if (data.errorCause && data.errorCause == 'JWT Token expired') {
                    showNotice('Datos de acceso no v??lidos');
                    fn.load('login.html');
                } else {
                    successHandler(data);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                mainLog.error(`${type.toUpperCase()} ${server + url} response:`, {jqXHR, textStatus, errorThrown});
                if (jqXHR) {
                    if (jqXHR.status === 401) {
                        if (currentPage != 'index-page' && currentPage != 'carga_page' && currentPage != 'login-page' && currentPage != 'sendGastos' && currentPage != 'pageUserPane') {
                            window.localStorage.setItem("lastPageUser", currentPage);
                            window.localStorage.setItem("lastAction", url);
                        }
                    }
                }
                //alert(JSON.stringify(jqXHR) + " " + textStatus + " " + errorThrown);
                httpErrorHandler(jqXHR, textStatus, errorThrown);
                if (errorHandler != null) {
                    errorHandler(jqXHR, textStatus, errorThrown);
                }
            }
        }).always(function () {
            hideLoading();
        });
    }
}

function showLoading() {
    $.mobile.loading("show");
}

function hideLoading() {
    $.mobile.loading("hide");
}


/*******************************************************************
 * FUNCION httpErrorHandler GUARDA LOS ERRORES QUE PUEDAN SURGIR Y *
 * LOS MUESTRA EN FORMA DE MENSAJE AL INTENTAR UNA ACCI??N          *
 *******************************************************************/
function httpErrorHandler(jqXHR, textStatus, errorThrown) {
    //showNotice(jqXHR.status);
    if (jqXHR.status === 401) {
        if (errorThrown === 'No such user') {
            showError("Credenciales no v??lidas");
        } else {
            showError("La sesi??n ha expirado");
            fn.load('login.html');
        }
    } else if (jqXHR.status === 403) {
        showError(jqXHR.status + " No est?? autorizado para ejecutar esta acci??n.");
    } else if (jqXHR.status === 0) {
        showNotice(jqXHR.status + " Se sugiere revisar su conexi??n a internet.");
    } else if (jqXHR.status != 200 && jqXHR.status != 404) {
        showError(jqXHR.status + " Ocurri?? un error inesperado.");
    }
}

/*******************************************************************************************************
/* FUNCIONES QUE DEVUELVEN UN MENSAJE SUCCESS/ERROR CON ANIMACION *
/*******************************************************************************************************/

function showError(message) {
    showMessage(message, 'error', 'img/error-icon.png');
}

function showSuccess(message) {
    showMessage(message, 'success', 'img/success-icon.png');
}

function showNotice(message) {
    showMessage(message, 'info', 'img/info-icon.png');
}

function showMessage(message, type, icon) {
    VanillaToasts.create({
        title: 'R&G Espinosa',
        text: message,
        type: type,
        icon: icon,
        timeout: 3000
    });
}

/*******************************************************************************************************
/* FUNCION iniPage INDICA QUE CUANDO LA PAGINA DE PAQUETES ESTE ACTIVA ESTA CARGARA OTRAS FUNCIONES JS *
/*******************************************************************************************************/
document.addEventListener('show', function (event) {
    $(document).off('keypress');
    var page = event.target;
    currentPage = page.id;
    if (page.id === 'index-page') {  // Inicia el calendario
        document.addEventListener("databaseready", verificarSesion, false);
    }else if(page.id == 'login-page'){ //P??gina login
        document.addEventListener("databaseready", function() {
            createDatabase();
            fn.onEnterPress(revisarLogin);
        }, false)
    } else if (page.id == 'buscar') { //Buscar siniestro
        fn.onEnterPress(initRefSin);
    } else if (page.id == 'inspeccionSin') {
        fn.onEnterPress(validarInspeccionSinSiniestro);
    } else if (page.id === 'ref') {
        var titleApp = window.localStorage.getItem("titleApp");
        if (titleApp != null && titleApp != undefined) {
            $('#titleApp').html(titleApp);
        }
        var numeroSiniestro = window.localStorage.getItem("numeroSiniestro");
        if (numeroSiniestro != null && numeroSiniestro != undefined) {
            $('#numeroSiniestro').html(numeroSiniestro);
        }
        var estatusSiniestro = window.localStorage.getItem("estatusSiniestro");
        if (estatusSiniestro != null && estatusSiniestro != undefined) {
            $('#estatusSiniestro').html(estatusSiniestro);
        }
        hideLoading();
    } else if (page.id == 'carga_page') {
        progressBar();
    } else if (page.id == 'sendGastos') {
        var title = window.localStorage.getItem("tituloGasto");
        $('#titlePage').html(title);
        validateGastosReport();
    } else if (page.id == 'enviarIns') {
        validateEnviarIns();
    } else if (page.id == 'cargaFotografias_page') {
        progressBarFotografias();
    }
});

jQuery.extend(jQuery.validator.messages, {
    required: "Campo Obligatorio",
    number: "Favor de ingresar un n\u00FAmero valido",
    digits: "Favor de ingresar solo n\u00FAmeros",
    date: "Favor de ingresar una fecha v\u00E1lida",
    email: "Favor de ingresar un e-mail v??lido",
    maxlength: jQuery.validator.format("Favor de ingresar no m\u00E1s de {0} car\u00E1cteres"),
    minlength: jQuery.validator.format("Favor de ingresar almenos {0} car\u00E1cteres"),
    rangelength: jQuery.validator.format("Favor de ingresar un valor de longitud entre {0} y {1} car\u00E1cteres"),
    range: jQuery.validator.format("Favor de ingresar un valor entre {0} y {1}"),
    max: jQuery.validator.format("Favor de ingresar un valor menor o igual a {0}"),
    min: jQuery.validator.format("Favor de ingresar un valor mayor o igual a {0}"),
    step: jQuery.validator.format("Favor de ingresar un valor que sea m??ltiplo de .25")
});

function backButton() {
    document.addEventListener("backbutton", onBackKeyDown, true);
}

function onBackKeyDown() {
    //navigator.app.exitApp();
}

function verificarConexion(){
    return window.navigator.onLine;
}

document.addEventListener("online", onDeviceOnline, false);

document.addEventListener("offline", onDeviceOffline, false);

var sincronizando = false;

function onDeviceOnline() {
    internetStatus = true;
}

function descargarInfoCaso() {
    var idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    var siniestroLoaded = window.localStorage.getItem("siniestroLoaded");
    if (siniestroLoaded == "false" && syncData == false) {
        syncData = true;
        verifySiniestroData(idSiniestro);
    }
}

function onDeviceOffline() {
    internetStatus = false;
}