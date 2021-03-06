var uploadLog = getLogger('uploadFile');


/**
 * Función para subir información con fotografía o archivos
 * @param {*} urlController Url de destino
 * @param {*} params Parametros a enviar
 * @param {*} fileKey Identificador o clave del parametro del documento
 * @param {*} metodoHttp POST, GET, PUT
 * @param {*} mimeType Tipo archivo (application/pdf, png, jpg)
 * @param {*} succesFileTransfer Función de éxito al subir un archivo
 * @param {*} errorFileTransfer Función de error al subir un archivo
 */
function uploadFile(urlController, params, fileKey, metodoHttp, mimeType, succesFileTransfer, errorFileTransfer) {
    var url = encodeURI(urlController);
    var options = new FileUploadOptions();
    options.fileKey = fileKey; //nombre del parametro que recibe la api
    options.fileName = params.dataUri.substr(params.dataUri.lastIndexOf('/')+1); //Nombre del archivo
    options.mimeType = mimeType; //TIPO mime
    options.params = params; //Parametros de la peticion
    options.chunkedMode = true; //Indica si acepta enviar parametros y documento al mismo tiempo
    var tokenLogin = window.localStorage.getItem("tokenLogin");
    var headers = {"Authorization":"Bearer " + tokenLogin};
    options.headers = headers;
    options.httpMethod = metodoHttp;
    var ft = new FileTransfer();
    uploadLog.trace(`${options.httpMethod} ${url} request file:${params.dataUri}`, options)
    function successHandler(response) {
        uploadLog.trace(`${options.httpMethod} ${url} success uploading:${params.dataUri}`);
        if (succesFileTransfer != null)
            succesFileTransfer(response);
    }
    function errorHandler(error) {
        uploadLog.error(`${options.httpMethod} ${url} error uploading:${params.dataUri}`, error, error.source, error.target);
        uploadLog.error(`${options.httpMethod} ${url} error params:`, params);
        uploadLog.error(`${options.httpMethod} ${url} error details:`, error);
        if (errorFileTransfer != null)
            errorFileTransfer(error);
    }
    ft.upload(params.dataUri, url, successHandler, errorHandler, options);
}

function validarExtensionInput(inputHTMLElement, extensiones) {
    return new Promise((resolve, reject) => {
        if (inputHTMLElement != null && inputHTMLElement.files.length > 0 && inputHTMLElement.files[0] && inputHTMLElement.files[0].type) {
            var fullPath = inputHTMLElement.value;
            // get original filename that can be used in the callback
            var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\')  : fullPath.lastIndexOf('/'));
            var filename = fullPath.substring(startIndex);
            if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
                filename = filename.substring(1);
            }
            var extension = filename.split('.')[1];
            if (extensiones.indexOf(extension.toUpperCase()) !== -1) {
                var reader = new FileReader();
                reader.onload = function () {
                    resolve()
                };
                reader.onerror = error => {
                    reject('Documento no disponible')
                }
                reader.readAsArrayBuffer(inputHTMLElement.files[0]);
            } else {
                reject('Extension invalida')
            }
        } else {
            reject('Input vacio')
        }
    })
}


function guardarArchivoDesdeInput(directorio, inputHTMLElement) {

    function validarInput(inputHTMLElement) {
        if (inputHTMLElement != null && inputHTMLElement.files.length > 0 && inputHTMLElement.files[0] && inputHTMLElement.files[0].type) {
            return Promise.resolve()
        }
        return Promise.reject(new Error('Input invalido'))
    }


    function obtenerNuevoNombreArchivo(inputHTMLElement) {
        return new Promise((resolve, reject) => {
            var randomPrefix = Math.random().toString(36).slice(-5);
            var fullPath = inputHTMLElement.value;
            // get original filename that can be used in the callback
            var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\')  : fullPath.lastIndexOf('/'));
            var filename = fullPath.substring(startIndex);
            if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
                filename = filename.substring(1);
            }
            resolve(randomPrefix + filename);
        });
    }
    
    function guardarFoto(inputHTMLElement, directorio, filename) {
        return new Promise((resolve, reject) => {
            filename = filename.replace(' ', '');
            var extension = filename.split('.')[1];
            var reader = new FileReader();
            reader.onload = function () {
                var blob = new Blob([reader.result], {
                    type: inputHTMLElement.files[0].type
                });
                window.resolveLocalFileSystemURL(directorio, function (dir) {
                    dir.getFile(filename, {
                        create: true
                    }, function (file) {
                        file.createWriter(function (fileWriter) {
                            fileWriter.onwriteend = function () {
                                resolve(directorio + filename);
                            }
                            fileWriter.write(blob);
                        }, reject);
                    });
                }, reject);
            };
            reader.onerror = error => {
                uploadLog.error('No se pudo guardar el archivo', error)
                reject('Imagen no disponible')
            }
            reader.readAsArrayBuffer(inputHTMLElement.files[0]);
        })
    }
    console.error('input recibido', inputHTMLElement)
    return validarInput(inputHTMLElement)
        .then(() => obtenerNuevoNombreArchivo(inputHTMLElement))
        .then(nombre => guardarFoto(inputHTMLElement, directorio, nombre))
}

function guardarFotoDesdeInput(directorio, inputHTMLElement) {

    function validarInput(inputHTMLElement) {
        if (inputHTMLElement != null && inputHTMLElement.files.length > 0 && inputHTMLElement.files[0] && inputHTMLElement.files[0].type) {
            return Promise.resolve()
        }
        return Promise.reject(new Error('Input invalido'))
    }


    function obtenerNuevoNombreArchivo(inputHTMLElement) {
        return new Promise((resolve, reject) => {
            var randomPrefix = Math.random().toString(36).slice(-5);
            var fullPath = inputHTMLElement.value;
            // get original filename that can be used in the callback
            var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\')  : fullPath.lastIndexOf('/'));
            var filename = fullPath.substring(startIndex);
            if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
                filename = filename.substring(1);
            }
            let extension = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
            resolve(getUUID() + '.' + extension);
        });
    }
    
    function guardarFoto(inputHTMLElement, directorio, filename) {
        console.error('guardando foto')
        return new Promise((resolve, reject) => {
            filename = filename.replace(' ', '');
            var extension = filename.split('.')[1];
            var reader = new FileReader();
            reader.onload = function () {
                console.error('se pudo cargar')
                // var blob = new Blob([reader.result], {
                //     type: inputHTMLElement.files[0].type
                // });
                // window.resolveLocalFileSystemURL(directorio, function (dir) {
                //     dir.getFile(filename, {
                //         create: true
                //     }, function (file) {
                //         file.createWriter(function (fileWriter) {
                //             fileWriter.onwriteend = function () {
                //                 resolve(file);
                //             }
                //             fileWriter.write(blob);
                //         }, reject);
                //     });
                // }, reject);
            };
            reader.onerror = error => {
                uploadLog.error('No se pudo guardar el archivo', error)
                reject('Imagen no disponible')
            }
            reader.readAsArrayBuffer(inputHTMLElement.files[0]);
        })
    }
    console.error('input recibido', inputHTMLElement)
    console.error('input recibido', inputHTMLElement.value)
    console.error('input recibido', inputHTMLElement.files)
    return validarInput(inputHTMLElement)
        .then(() => obtenerNuevoNombreArchivo(inputHTMLElement))
        .then(nombre => guardarFoto(inputHTMLElement, directorio, nombre))
        //.then(fileUri =>  fileUri.replace(/^file:\/\//, '')) // IOS FIX 
}
