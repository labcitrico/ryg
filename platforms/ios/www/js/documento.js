/**
 * Función que inicia la pantalla para subir documento
 */
function documento() {
    fn.load('documento.html');
    //Seleccionar si existe un documento de acuerdo al idInspeccion
    var idInspeccion = window.localStorage.getItem("inspeccion_id");
    sqlQuery('SELECT idDocumento FROM DetalleInspeccion WHERE idInspeccion = ?', [idInspeccion], function (detalleDocumento) {
        validateDocumentoCargado();
        if (detalleDocumento != true && detalleDocumento[0].idDocumento != null) {//No tiene un documento cargado
            var idDocumento = (detalleDocumento[0].idDocumento);
            sqlQuery('SELECT * FROM Documento WHERE idDocumento = ?', [idDocumento], function (documento) {
                if (documento != true) { //Se obtiene el documento cargado
                    //Grupo documento
                    sqlQuery('SELECT * FROM CatalogoGrupoDocumento ORDER BY tipo_anexo_g_nombre ASC', null, function (lstGrupo) {
                        if (lstGrupo != true) {
                            var selectGrupos = '';
                            selectGrupos += '<ons-select id="idGrupo" onchange="cargarSelect()" required>';
                            selectGrupos += '<option value="" >Seleccione una opción</option>';
                            lstGrupo.forEach(function (grupo) {
                                if (grupo.doc_grup_id == documento[0].grupo) {
                                    selectGrupos += '<option value="' + grupo.tipo_anexo_g_id + '" selected>' + grupo.tipo_anexo_g_nombre + '</option>';
                                } else {
                                    selectGrupos += '<option value="' + grupo.tipo_anexo_g_id + '" >' + grupo.tipo_anexo_g_nombre + '</option>';
                                }
                            });
                            selectGrupos += '</ons-select>';
                            $('#grupoSel').html(selectGrupos);
                            //Tipo documento
                            sqlQuery('SELECT * FROM CatalogoTipoAnexo WHERE tipo_anexo_grupo = ? ORDER BY tipo_anexo_nombre ASC', [documento[0].grupo], function (lstDoc) {
                                var selectDocumento = '';
                                selectDocumento += '<ons-select id="documentoSel">';
                                selectDocumento += '<option value="" >Seleccione una opción ...</option>';
                                lstDoc.forEach(function (doc) {
                                    if (doc.tipo_anexo_id == documento[0].selecsecundario) {
                                        selectDocumento += '<option value="' + doc.tipo_anexo_id + '" selected>' + doc.tipo_anexo_nombre + '</option>';
                                    } else {
                                        selectDocumento += '<option value="' + doc.tipo_anexo_id + '" >' + doc.tipo_anexo_nombre + '</option>';
                                    }
                                });
                                selectDocumento += '</ons-select>';
                                $('#idDocumento').html(selectDocumento);
                            });
                        }
                    });
                    if (documento[0].up_documento != null && documento[0].up_documento != undefined) {
                        $('#idFile').html('Documento Cargado');
                        $('#idFile').css('background-color', '#FE8416');
                        $('#idFile').css('color', 'white');
                    }
                    document.getElementById('idFecha').value = obtenerFecha(new Date());
                    $('#comentarioDoc').val(documento[0].anexos_observaciones);
                } else {
                    showNotice("ha ocurrido un error inesperado, intentelo mas tarde");
                }
            });
        } else { //Documento aún no cargado
            sqlQuery('SELECT * FROM CatalogoGrupoDocumento ORDER BY tipo_anexo_g_nombre ASC', null, function (grupos) {
                if (grupos != true) {
                    var selectGrupos = '';
                    selectGrupos += '<ons-select id="idGrupo" name="idGrupo" onchange="cargarSelect()" required>';
                    selectGrupos += '<option value="" >Seleccione una opción</option>';
                    grupos.forEach(function (grupo) {
                        selectGrupos += '<option value="' + grupo.tipo_anexo_g_id + '" >' + grupo.tipo_anexo_g_nombre + '</option>';
                    });
                    selectGrupos += '</ons-select>';
                    $('#idFecha').val(new Date());
                    $('#grupoSel').html(selectGrupos);
                    $('#comentarioDoc').html('');
                } else {
                    showNotice("ha ocurrido un error inesperado, intentelo mas tarde");
                }
            });
        }
    });
}

/** 
 * Funcion para llenar los selects de pantalla se subir documento de inspeccion
 */
function cargarSelect() {
    var numSelect = $("#idGrupo").val();
    var selectDocumento = '';
    sqlQuery('SELECT * FROM CatalogoTipoAnexo WHERE tipo_anexo_grupo = ? ORDER BY tipo_anexo_nombre ASC', [numSelect], function (doc) {
        selectDocumento += '<ons-select id="documentoSel" name="documentoSel" required>';
        selectDocumento += '<option value="" >Seleccione una opción ...</option>';
        doc.forEach(function (doc) {
            selectDocumento += '<option value="' + doc.tipo_anexo_id + '" >' + doc.tipo_anexo_nombre + '</option>';
        });
        selectDocumento += '</ons-select>';
        if (doc != true) {
            $('#idDocumento').html(selectDocumento);
        } else {
            showNotice("ha ocurrido un error inesperado, intentelo mas tarde");
        }
    });
}

/**
 * En esta funcion se guardaran los datos del documento
 */
function crearDocumento() {
    document.getElementById('btnCrearDocumentoInspeccion').setAttribute('disabled', 'disabled');
    document.getElementById('btnCrearDocumentoInspeccion').insertAdjacentHTML('beforeend', `<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" style="margin-bottom: 2px;"></span>`)
    let edita_dato = window.localStorage.getItem("idSiniestroServidor");
    let grupo = $("#idGrupo").val();
    let selecsecundario = $("#documentoSel").val();
    let fecha = $("#idFecha").val();
    let dia = fecha.split("-")[2];
    let mes = fecha.split("-")[1];
    let anio = fecha.split("-")[0];
    let documento = document.querySelector('[name="documentoInspeccion"]').value;
    let extension = documento.split('.').pop().toLowerCase();
    let mimetype = 'application/pdf';
    if (extension == 'doc') {
        mimetype = 'application/msword';
    } else if (extension == 'docx') {
        mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
    }
    let anexos_observaciones = $("#comentarioDoc").val();
    let idInspeccion = window.localStorage.getItem("inspeccion_id");

    if (documento != null && documento.trim() != '') {
        return sqlPromise(`INSERT INTO Documento (edita_dato, grupo, fecha, anio, mes, dia, selecsecundario, 
                    up_documento, anexos_observaciones, mimetype) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [edita_dato, grupo, fecha, anio, mes, dia, selecsecundario, documento, anexos_observaciones, mimetype])
            .then(r => r.insertId)
            // Actualizar documento de inspeccion y guardar peticion
            .then(documentoId => sqlPromise('UPDATE DetalleInspeccion SET idDocumento = ? WHERE idInspeccion = ?', [documentoId, idInspeccion])
                .then(() => guardarPeticionPromise(server + "anexos.php", 'DOCUMENT_FOTO', 'Documento', 'idDocumento', documentoId)))
            .then(() => {
                showSuccess("Se ha subido con exito el pdf");
                backVerInspeccion();
            })
            .catch(error => {
                showNotice("Ha ocurrido un error intentelo mas tarde");
                inspeccionLog.error('error al guardar documento inspeccion', error);
            });
    } else {
        showNotice("Ha ocurrido un error intentelo mas tarde");
    }
}

/** 
 * Crea un objeto para enviar la informacion al servidor 
 * del documento de inspeccion 
 */
function docFotoToJson(documento) {
    var params = {
        edita_dato: documento.edita_dato,
        anio: documento.anio,
        mes: documento.mes,
        dia: documento.dia,
        selecsecundario: documento.selecsecundario,
        up_documento: documento.up_documento,
        anexos_observaciones: documento.anexos_observaciones,
        dataUri: documento.up_documento
    }
    return params;
}

/**
 * Valida que el documento cargado no este vacio
 */
function validateDocumentoCargado() {
    validateForm('formCargaDocumento', function () {
        let input = document.querySelector('[name="documentoInspeccion"]');
        if (input != null && input.value != null && input.value.trim() != '') {
            crearDocumento();
        } else {
            showError('Debe cargar un documento');
        }
    });
}

/**
 * Sirve para activar el evento submit del formulario subir documento
 */
function submitDocumentoCargado() {
    $('#formCargaDocumento').submit();
}