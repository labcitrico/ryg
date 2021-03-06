var fotoLog = getLogger('fotografias');
/**
 * Función que selecciona la foto de la 
 * galeria de imagenes
 * @param {function} successHandler
 * @param {function} failureHandler
 */
function openPhotoLibrary(successHandler, failureHandler){
    var srcType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
    var options = setOptions(srcType);
    takePhoto(successHandler, failureHandler, options);
}

/**
 * Función que captura la foto por
 * medio de la camara
 * @param {function} successHandler
 * @param {function} failureHandler
 */
function openPhotoCamera(successHandler, failureHandler){
    var srcType = Camera.PictureSourceType.CAMERA;
    var options = setOptions(srcType);
    takePhoto(successHandler, failureHandler, options);
}

/**
 * Función para capturar o cargar la foto
 * @param {function} successHandler
 * @param {function} failureHandler
 * @param {Object} options
 */
function takePhoto(successHandler, failureHandler, options){
    navigator.camera.getPicture(successHandler, failureHandler, options);
    fn.hideActionSheet();
}

/**
 * Settea las opciones de la camara
 * @param {string} srcType 
 */
function setOptions(srcType) {
    var options = {
        quality: 90,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: srcType,
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        allowEdit: false,
        correctOrientation: false
    }
    return options;
}

/**
 * Actualiza el nombre en la tabla fotografias
 * @param {number} indexElement 
 */
function updateNombreFoto(indexElement) {
    var idCatalogo = $('#idCatalogo-' + indexElement).val();
    sqlQuery('SELECT tipo_foto_nombre FROM CatalogoTipoFoto WHERE tipo_foto_id = ?', [idCatalogo], function (catalogoSelected) {
        if (catalogoSelected != true) {
            $('#nombre_foto-' + indexElement).val(catalogoSelected[0].tipo_foto_nombre);
        }
    });
}

/**
 * Función que abre el modal para añadir
 * más modulos de carga de fotografía
 */
function showModal() {
    var modal = document.querySelector('ons-modal');
    modal.show();
}

/**
 * Función que cierra el modal para 
 * cargar más modulos de carga de
 * fotografía
 */
function closeModal() {
    var modal = document.querySelector('ons-modal');
    modal.hide();
}


/**
 * Función que inicializa las validaciones
 * para el formulario
 * de agregar nuevas fotografias
 */
function validateNuevasFotografias() {
    $('#formFotografias').validate({
        errorClass: "errorForm",
        validClass: "validForm",
        submitHandler: function () {
            InspeccionFotografia.guardarFotos();
        },
        invalidHandler: function (event, validator) {
            if (validator.numberOfInvalids()) {
                showError("Revisa los campos marcados");
            }
        }
    });
}

/**
 * Función para validar el formulario
 * de nuevas fotografias
 */
function submitNuevasFotografias() {
    $('#formFotografias').submit();
}

/**
 * Función que setea un objeto con los
 * parametros correspondientes para el 
 * envio de cada fotografía
 */
function fotoInspeccionToJson(fotoInspeccion) {
    var fotoInspeccionJson = {
        edita_dato: fotoInspeccion.edita_dato,
        fotos_nombre: fotoInspeccion.fotos_nombre,
        fotos_observaciones: fotoInspeccion.fotos_observaciones,
        up_documento: fotoInspeccion.up_documento,
        dataUri: fotoInspeccion.up_documento
    }
    return fotoInspeccionJson;
}

/***************************************************************
 *                  FOTOGRAFIAS CARGADAS
 ***************************************************************/
/**
 * Función para mostrar las fotografías cargadas
 */
function openFotografiasCargadas() {
    fn.load('fotografiasCargadas.html');
    var idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    showNotice("Cargando fotografías...");
    if (device.platform == 'iOS') {
        sqlPromise('SELECT * FROM FotoInspeccion WHERE edita_dato = ? ORDER BY fotos_id ASC;', [idSiniestro])
            .then(rowsAsList)
            .then(showFotosCargadas);
    } else {
        sqlPromise('SELECT idFoto, fotos_id, fotos_nombre, fotos_observaciones, up_documento, edita_dato, fecha_ingreso, cantidadFotosPlus, nombre_foto, tipo_foto_nombre FROM FotoInspeccion WHERE edita_dato = ? ORDER BY fotos_id ASC;', [idSiniestro])
            .then(rowsAsList)
            .then(showFotosCargadas);
    }
}

/**
 * Función para mostrar las fotografias
 * cargadas a una inspeccion
 * @param {Array<FotoInspeccion>} lstFotos 
 */
function showFotosCargadas(lstFotos) {
    // si no tiene fotos se muestra vacio
    if (lstFotos == null || lstFotos.length == 0) {
        $('#fotosUpContent').html(`
            <center>
                <h4>No se encontraron fotografías en el dispositivo</h4>
            </center>
        `);
        return;
    }

    // si tiene fotos se genera la tabla
    let html = '';
    
    for (let i = 0; i < lstFotos.length; i++) {
        let td = '';
        let foto = lstFotos[i];
        if (foto.tipo_foto_nombre != null) {
            td = `<td>${foto.tipo_foto_nombre}</td>`;
        } else if (foto.nombre_foto) {
            td = `<td>${foto.nombre_foto}</td>`;
        } else {
            td += '<td>No definido</td>';
        }
        html += `
            <tr>
                <td>${foto.fecha_ingreso}</td>
                <td><img width="130px" data-source src="${device.platform == 'iOS' ? foto.base64 : foto.up_documento}" 
                        data-foto-miniatura="${foto.idFoto}"/>
                </td>
                ${td}
            </tr>
        `;
    }
    document.getElementById('fotosUpContent').innerHTML = `
        <table class="table tableKronos table-striped table-sm shadow-sm">
            <thead>
                <tr>
                    <th>Fecha Ingreso</th>
                    <th>Fotografía</th>
                    <th>Tipo Fotografía</th>
                </tr>
            </thead>
            <tbody>
                ${html}
            </tbody>
        </table>
    `;
    document.querySelectorAll('[data-foto-miniatura]').forEach(miniatura => {
        miniatura.onclick = e => {
            let modal = document.getElementById('vistaPreviaImagenInspeccion')
            modal.show();
            modal.querySelector('img').src = miniatura.src;
            modal.querySelector('[data-abrir]')
                .onclick = () => abrirDocumentoConAplicacionDeTerceros(miniatura.dataset.source, 'image/png');
            modal.querySelector('[data-cerrar]')
                .onclick = () => modal.hide();
        }
    })
}

/**
 * Función para descargar un archivo de
 * fotografía
 * @param {FileEntry} fileEntry 
 * @param {string} fotos_id 
 * @param {function} callback 
 */
function downloadPhoto(fileEntry, fotos_id, callback) {
    var apiURL = server + 'foto.php?fotos_id=' + fotos_id;
    var ft = new FileTransfer();
    var fileURL = fileEntry.toURL();
    ft.download(apiURL, fileURL, function (photoEntry) {
            photoEntry.file(function (file) {
                var reader = new FileReader();
                reader.onloadend = function () {
                    callback({
                        fullPath: file.nativeURL,
                        base64: this.result
                    });
                }
                reader.readAsDataURL(file);
            });
        }, function (err) {
            console.error("fsDownload: " + JSON.stringify(err));
            callback(null);
        },
        null, {
            headers: {
                "Authorization": "Bearer " + window.localStorage.getItem("tokenLogin")
            }
        });
}

/**
 * Función que descarga la lista de fotografias
 * de una inspección
 */
function downloadPhotos() {
    contentLoadedFotografias = 0;
    if(verificarConexion() == true){
        var numSin = window.localStorage.getItem("idSiniestroServidor");
        Directorios.obtenerDirectorioEspinosaPhotos(numSin).then(photosDir => {
            sendGetRequest('fotos.php?caso=' + numSin, function (lstFotos) {
                if (lstFotos) {
                    if (lstFotos.length != 0) {
                            fn.load('cargaFotografias.html');
                           showNotice("Este proceso suele tardar, espere un momento...");
                        savePhotoFile(photosDir, lstFotos, 0, function(){
                        });
                    }
                }
            });
        });
    }else{
        showError("Necesitas internet para descargar las fotografías");
    }
}