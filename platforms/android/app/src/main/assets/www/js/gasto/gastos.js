var salir; //Variable que indica si despues de registrar un gasto desea salir o continuar
var gastoLog = getLogger('gasto');
//Insertar un reporte de gasto
var insertGasto = 'INSERT INTO Gasto (gastos_repor_id, '
    + 'gastos_repor_caso, '
    + 'gastos_repor_consecu, '
    + 'gastos_repor_user, '
    + 'gastos_repor_ajustador, '
    + 'gastos_repor_moneda, '
    + 'gastos_repor_anticipo, '
    + 'gastos_repor_nombre, '
    + 'gastos_repor_f_ini, '
    + 'gastos_repor_f_fin, '
    + 'gastos_repor_mail, '
    + 'gastos_repor_coment, '
    + 'gastos_repor_fecha_envi, '
    + 'gastos_repor_fecha, '
    + 'ajustador, '
    + 'correspon_caso, '
    + 'page) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
//Actualizar un reporte de gasto
var updateGasto = 'UPDATE Gasto SET gastos_repor_id = ?, '
    + 'gastos_repor_caso = ?, '
    + 'gastos_repor_consecu = ?, '
    + 'gastos_repor_user = ?, '
    + 'gastos_repor_ajustador = ?, '
    + 'gastos_repor_moneda = ?, '
    + 'gastos_repor_anticipo = ?, '
    + 'gastos_repor_nombre = ?, '
    + 'gastos_repor_f_ini = ?, '
    + 'gastos_repor_f_fin = ?, '
    + 'gastos_repor_mail = ?, '
    + 'gastos_repor_coment = ?, '
    + 'gastos_repor_fecha_envi = ?, '
    + 'gastos_repor_fecha = ?, '
    + 'ajustador = ?, '
    + 'correspon_caso = ? WHERE idGasto = ?';
//Actualizar un reporte de gasto sin remplazar datos
var updateGasto2 = 'UPDATE Gasto SET gastos_repor_id = ?, '
    + 'gastos_repor_caso = ?, '
    + 'gastos_repor_consecu = ?, '
    + 'gastos_repor_user = ?, '
    + 'gastos_repor_ajustador = ?, '
    + 'gastos_repor_moneda = ?, '
    + 'gastos_repor_nombre = ?, '
    + 'gastos_repor_f_ini = ?, '
    + 'gastos_repor_f_fin = ?, '
    + 'gastos_repor_mail = ?, '
    + 'gastos_repor_coment = ?, '
    + 'gastos_repor_fecha_envi = ?, '
    + 'gastos_repor_fecha = ?, '
    + 'ajustador = ?, '
    + 'correspon_caso = ? WHERE idGasto = ?';
//Actualizar un detalle de gasto
var queryUpdateDGasto = 'UPDATE DetalleGasto SET gastos_id = ?, '
    + 'gastos_caso = ?, '
    + 'gastos_user = ?, '
    + 'gastos_ajustador = ?, '
    + 'gastos_visada = ?, '
    + 'gastos_id_reporte = ?, '
    + 'gastos_valor = ?, '
    + 'gastos_cargar = ?, '
    + 'gastos_moneda = ?, '
    + 'gastos_fecha_real = ?, '
    + 'gastos_emisor = ?, '
    + 'gastos_descripcion = ?, '
    + 'gastos_concepto = ?, '
    + 'gastos_razon_social = ?, '
    + 'gastos_viaje_ini = ?, '
    + 'gastos_viaje_fin = ?, '
    + 'gastos_amex = ?, '
    + 'gastos_nulo = ?, '
    + 'gastos_archivo = ?, '
    + 'gastos_archivo_xml = ?, '
    + 'gastos_archivo_3 = ?, '
    + 'gastos_fecha = ? '
    + 'WHERE idDetalleGasto = ?';

/**************************************************************
                    * LISTA DE GASTOS*
 **************************************************************/

/**
 * Consulta la lista de gastos en el servidor
 * @param {*} page 
 */
function consultarGastos(page) {
    // si esta en la pantalla de nuevo/editar gasto y esta eligiendo un ajustador
    // se debe ocultar la seleccion del ajustador
    let seleccionAjustador = document.getElementById('seleccionarAjustador');
    if (seleccionAjustador != null && seleccionAjustador.style.display == 'block') {
        document.querySelectorAll('ons-card').forEach(card => card.style.display = 'block');
        document.getElementById('seleccionarAjustador').style.display = 'none';
        return;
    }
    showLoading();
    fn.load('gastos.html');
    //Se eliminan los datos locales de otros siniestros
    window.localStorage.removeItem("tituloGasto");
    window.localStorage.removeItem("monedaGasto");
    window.localStorage.removeItem("idGastoLocal");
    window.localStorage.removeItem("idGastoServidor");
    window.localStorage.removeItem("idDetalleGasto");
    //Se obtiene el siniestro actual
    let idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    if (idSiniestro == null)
        idSiniestro = 0;
    gastoLog.debug('consultando gastos', { page, idSiniestro, synced: isSynced(), conexion: verificarConexion() });
    window.localStorage.setItem("pageActual", page);

    if (verificarConexion() == true && (isSynced() == true || isSynced() == "true")) { //Si tiene internet consulta los gastos con el servidor
        window.localStorage.removeItem("limitGastoUsuario");
        GastosService.obtenerGastosConteo(idSiniestro).then(conteo => {
            console.error('conteo de gastos ', conteo)
            if (conteo == 0) {
                actualizarListadoGasto(idSiniestro)
            } else {
                getGastoData(idSiniestro, page);
            }
        })

    } else {
        if (idSiniestro != null && idSiniestro != undefined) {
            getGastoData(idSiniestro, page);
        } else {
            window.localStorage.setItem("limitGastoUsuario", 10);
            getGastoData(0, page)
        }
    }
}

/**
 * Actualiza el listado de gastos
 * @param {number} idSiniestro 
 */
function actualizarListadoGasto() {
    let idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    console.error('idSiniestro', idSiniestro)
    if (idSiniestro == null)
        idSiniestro = 0;
    let caso_gasto = window.localStorage.getItem("idSiniestroServidor");
    createAlertDialog('dialogoActualizarGastos', 'dialogoActualizarGastos.html')
    GastosService.obtenerListaGastoServidor(idSiniestro).then(listado => {
        let promesas = [];
        for (let i = 0; i < listado.resultados.length; i++) {
            let gastoServidor = listado.resultados[i];
            let promesa = GastosService.obtenerGastoPorGastosReporId(gastoServidor.gastos_repor_id).then(gasto => {
                if (gasto != null) { // existe se debe actualizar
                    return GastosService.gastoTienePeticionesPendiente(gasto.idGasto).then(tienePendiente => {
                        if (tienePendiente) { // este gasto tiene cambios pendientes de subir al servidor
                            console.error('este gasto tiene peticiones pendiente', gasto)
                            return
                        }
                        gastoServidor.correspon_caso = caso_gasto != null ? caso_gasto : 0;
                        gastoServidor.idGasto = gasto.idGasto;
                        return GastosService.actualizarGasto(gastoServidor);
                    })
                } else { // no existe, se inserta en la BD
                    gastoServidor.correspon_caso = caso_gasto != null ? caso_gasto : 0;
                    return GastosService.insertarGasto(gastoServidor);
                }
            });
            promesas.push(promesa)
        }
        return Promise.all(promesas).then(() => {
            updatePagesGasto(() => getGastoData(idSiniestro, 1))
        })
    })
        .catch(error => {
            gastoLog.error('No se pudo actualizar el listado de gastos', error);
            showError('No se pudo actualizar el listado de gastos')
        })
        .finally(() => hideAlertDialog('dialogoActualizarGastos'))
}

/**
 * Función que obtiene los datos de la base de
 * datos y prepara para mostrar en pantalla
 * @param {*} idSiniestro 
 * @param {*} page 
 */
function getGastoData(idSiniestro, page) {
    gastoLog.debug('obteniendo gasto de la base de datos', idSiniestro, page);
    var orden;
    var params = new Array();
    if (idSiniestro == 0) {//Si no tiene siniestro
        orden = 'AND page = ? ORDER BY gastos_repor_consecu DESC';
    } else { //Si tiene un siniestro
        orden = 'AND page = ? ORDER BY gastos_repor_consecu ASC';
    }
    //Se declaran los parametros
    params.push(idSiniestro);
    params.push(page);
    //Se obtiene el limite de resultados con base al limite del usuario
    var limitQuery = window.localStorage.getItem("limitGastoUsuario");
    limitQuery = limitQuery ? limitQuery : 20;

    sqlQuery('SELECT * FROM Gasto WHERE gastos_repor_caso = ?  ' + orden + ' LIMIT ' + limitQuery, params, function (listGastos) {
        var totalRegGastos = window.localStorage.getItem("totalRegGastos");
        if (totalRegGastos != null && totalRegGastos != undefined) {
            mostrarGastos(listGastos, page);
        } else {
            sqlQuery('SELECT COUNT(*) FROM Gasto WHERE gastos_repor_caso = ?', [idSiniestro], function (registrosTotales) {
                if (registrosTotales) {
                    if (registrosTotales[0]["COUNT(*)"]) {
                        window.localStorage.setItem("totalRegGastos", registrosTotales[0]["COUNT(*)"]);
                    }
                }
                mostrarGastos(listGastos, page);
            });
        }
    });
}


/**
 * Función que muestra el 
 * listado de gastos
 * @param {*} listaGastos 
 * @param {*} pageActual 
 */
function mostrarGastos(listaGastos, pageActual) {
    hideLoading();
    var html = '';
    var titleApp = window.localStorage.getItem("titleApp");
    var totalRegGastos = 0;
    if (listaGastos != null) {
        totalRegGastos = listaGastos.length;
    }
    var gastoUserLim = window.localStorage.getItem("limitGastoUsuario");
    window.localStorage.removeItem("monedaGasto");
    window.localStorage.removeItem("idGasto");
    window.localStorage.removeItem("numeroReporte");
    $('#titleApp').html(titleApp);
    var idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    if (listaGastos != null) {
        if (listaGastos.length > 0) {
            //Tabla
            html += '<table class="table tableKronos table-striped table-sm shadow-sm">';
            //Encabezado de tabla
            html += '<thead>'
                + '<tr>';
            if (idSiniestro != null && idSiniestro != undefined) {
                html += '<th>Ref. R&G N°</th>';
            } else {
                html += '<th>Fecha</th>';
            }
            html += '<th>Ajustador</th>'
                + '<th>Consecutivo</th>'
                + '</tr>'
                + '</thead>';

            //Elementos de la tabla
            html += '<tbody>';
            listaGastos.forEach(function (gasto) {
                html += '<tr onclick="verReporteGasto(' + gasto.gastos_repor_id + ', ' + gasto.idGasto + ');">';
                if (idSiniestro != null && idSiniestro != undefined) {
                    html += '<th style="color:#FE8416;">' + idSiniestro + '</th>';
                } else {
                    html += '<th style="color:#FE8416;">' + fn.formatDate(gasto.gastos_repor_fecha, " ") + '</th>';
                }
                html += '<th>' + gasto.ajustador + '</th>';
                if (gasto.gastos_repor_consecu != null && gasto.gastos_repor_consecu != 0) {
                    html += '<th>' + numeral(gasto.gastos_repor_consecu).format('000') + '</th>';
                } else {
                    html += '<th>---</th>';
                }
                html += '</tr>';
            });
            html += '</tbody>';
            html += '</table>';
            GastosService.obtenerGastosConteo(idSiniestro).then(total => {
                let limite = 10;
                if (idSiniestro != null && idSiniestro > 0) {
                    limite = 20;
                }
                window.localStorage.setItem("limitGastoUsuario", limite);
                html += fn.pagination(total, pageActual);
                html += fn.dataViewed(total, pageActual, fn.dinamicLimit(limite)); //Indica numero de resultados
                $('#gastosContent').html(html);
                $('#page-' + pageActual).addClass("active");
                $('.pagNumberPage').click(function () {
                    var id = $(this).attr('id');
                    pageObj = id.split("-")[1];
                    consultarGastos(pageObj);
                });
            })
        } else {
            html += '<center><h4>No se encuentran gastos o no se han cargado</h4></center>';
            if (totalRegGastos && totalRegGastos != null) {
                html += fn.pagination(totalRegGastos, pageActual);
                html += fn.dataViewed(totalRegGastos, pageActual, fn.dinamicLimit(gastoUserLim ? gastoUserLim : 10)); //Indica numero de resultados
            }
        }
    } else {
        html += '<center><h4>No se encuentran gastos o no se han cargado</h4></center>';
    }
    $('#gastosContent').html(html);
    $('#page-' + pageActual).addClass("active");
    $('#btnNuevoReporteGasto').attr('disabled', false);
    //Funcion cuando se presiona el botón
    $('.pagNumberPage').click(function () {
        var id = $(this).attr('id');
        pageObj = id.split("-")[1];
        consultarGastos(pageObj);
    });
    hideLoading();
}

/**************************************************************
                    * REPORTE DE GASTO*
 **************************************************************/

/**
 * Función que busca en el servidor 
 * el reporte general de un gasto
 * @param {*} gastos_repor_id 
 */
function verReporteGasto(gastos_repor_id, idGasto) {
    window.localStorage.setItem("idGastoLocal", idGasto); //Inicio de sesión inteli
    window.localStorage.setItem("idGastoServidor", gastos_repor_id);
    fn.load('reporteGasto.html');
    gastoLog.debug('obteniendo reporte gasto', {
        conexion: verificarConexion(),
        synced: isSynced(),
        gastos_repor_id
    });
    if (verificarConexion() == true) {
        showLoading();
        if (gastos_repor_id != null && gastos_repor_id != undefined) { //Si existe el numero de reporte de gasto
            GastosService.actualizarDetallesDeGasto(gastos_repor_id, idGasto)
                .then(() => getDataReporteGasto(idGasto))
        } else {
            getDataReporteGasto(idGasto);
        }
    } else {
        getDataReporteGasto(idGasto);
    }
}

/**
 * Función que obtiene los datos
 * del reporte de gastos para 
 * imprimirlos en pantalla
 */
function getDataReporteGasto(idGasto) {
    showLoading();
    gastoLog.debug(`obteniendo reporte gasto de la BD idGasto:${idGasto}`)
    sqlQuery('SELECT * FROM Gasto WHERE idGasto = ?', [idGasto], function (reportGasto) {
        if (reportGasto != true) {
            sqlQuery(`SELECT * FROM DetalleGasto d 
                LEFT JOIN Peticiones p ON p.entidad = 'EliminarDetalleGasto' AND p.estatus = 'PEND'
                    AND d.idDetalleGasto = p.identificador
                WHERE fk_idGasto = ? AND p.identificador IS NULL`, [idGasto], function (detalleGasto) {
                if (detalleGasto == true) {
                    mostrarReporteGasto(reportGasto, null);
                    if (verificarConexion() != true) {
                        showNotice("No hay conexión a Internet");
                    }
                } else {
                    mostrarReporteGasto(reportGasto, detalleGasto);
                }
            });
        } else {
            showError('No se ha podido consultar el reporte de gasto');
        }
        hideLoading();
    });
}

/**
 * Función que muestra el reporte del gasto
 * @param {*} reporteGasto 
 */
function mostrarReporteGasto(reporteGasto, detalleGasto) {
    var titleApp = window.localStorage.getItem("titleApp");
    window.localStorage.removeItem("comprob1");
    $('#titleApp').html(titleApp);
    var caso_reporte_gasto = reporteGasto[0].gastos_repor_caso;
    caso_reporte_gasto = caso_reporte_gasto ? caso_reporte_gasto : 0;
    var title = 'Reporte N°' + caso_reporte_gasto + '-' + reporteGasto[0].ajustador + '-' + numeral(reporteGasto[0].gastos_repor_consecu).format('000');
    window.localStorage.setItem("tituloGasto", title);
    $('#titlePage').append(title);
    //Numero de siniestro
    $('#numeroSiniestro').html(reporteGasto[0].gastos_repor_caso);
    //Anticipo
    $('#inpAnticipo').val(reporteGasto[0].gastos_repor_anticipo);
    //Moneda
    $('#gastos_repor_moneda').html(reporteGasto[0].gastos_repor_moneda);
    window.localStorage.setItem("monedaGasto", reporteGasto[0].gastos_repor_moneda);
    //Id del reporte de gasto
    $('#gasto_id').val(reporteGasto[0].gastos_repor_id);
    //Id del reporte de gasto
    $('#idGasto').val(reporteGasto[0].idGasto);

    window.localStorage.setItem("idGasto", reporteGasto[0].idGasto);
    window.localStorage.setItem("numeroReporte", reporteGasto[0].gastos_repor_id);

    var html = '';
    var html2 = '';
    //Se revisa si existe informacion
    if (detalleGasto != null) {
        if (detalleGasto.length != 0) {
            html += fn.dataViewed(detalleGasto.length, 1, detalleGasto.length); //Indica numero de resultados
            //Tabla
            html += '<table class="table tableKronos table-striped table-sm m-0">';
            //Encabezado de tabla
            html += '<thead>'
                + '<tr>'
                + '<th>Ajustador</th>'
                + '<th>Concepto</th>'
                + '<th>Total</th>'
                + '</tr>'
                + '</thead>';
            //Elementos de la tabla
            html += '<tbody>';
            detalleGasto.forEach(function (detalle) {
                html += '<tr onclick="TablaDetalleGasto.verDetalleGasto(' + detalle.idDetalleGasto + ', ' + reporteGasto[0].idGasto + ');">';
                html += '<th>' + detalle.ajustador + '</th>';
                html += '<th style="color:#FE8416;">' + detalle.gastos_concepto + '</th>';
                html += '<th>' + detalle.gastos_valor + '</th>';
                html += '</tr>';
            });
            html += '</tbody>';
            html += '</table>';
        } else {
            html += '<center><h4>No hay detalle relacionado</h4></center>';
        }
    } else {
        html += '<center><h4>No hay detalle relacionado</h4></center>';
    }
    let reporteGastoSeleccionado = reporteGasto[0];
    console.error('id ajustador', reporteGastoSeleccionado.gastos_repor_ajustador);
    CatalogoService.obtenerAjustadorPorId(reporteGastoSeleccionado.gastos_repor_ajustador).then(ajustador => {
        $('[data-ajustador-nombre]').val(ajustador.nombre);
        $('[data-ajustador-nombre-defecto]').val(ajustador.nombre);
    }).catch(e => {
        $('[data-ajustador-nombre]').val(reporteGastoSeleccionado.ajustador);
        $('[data-ajustador-nombre-defecto]').val(reporteGastoSeleccionado.ajustador);
    })
    html2 += '<ons-list-item modifier="longdivider">'
        + '<center>'
        + '<ons-button modifier="quiet" class="center sh-none" style="width: 250px;font-size:18px;background-color:#D8DADB;color:#0081BD;" onclick="updateAnticipo();">'
        + '<ons-icon icon="md-card-sd" style="width: 25px; color: #FE8416;"></ons-icon>'
        + 'Actualizar Anticipo'
        + '</ons-button>'
        + '</center>'
        + '</ons-list-item>';
    if (detalleGasto != null) {
        if (detalleGasto.length != 0) {
            html2 += '<ons-list-item modifier="longdivider">'
                + '<center>'
                + '<ons-button modifier="quiet" class="center sh-none" style="width: 250px;font-size:18px;background-color:#D8DADB;color:#0081BD;" onclick="initSendGastos();">'
                + '<ons-icon icon="check" style="width: 25px; color: #FE8416;"></ons-icon>'
                + 'Enviar Gastos'
                + '</ons-button>'
                + '</center>'
                + '</ons-list-item>';
        }
    }
    $('#detalleReporteContent').html(html);
    $('#optionButtons').html(html2);
    hideLoading();
    $('#btnNuevoDetalleGasto').attr('disabled', false);
}

/**
 * Función para cargar la pantalla de un nuevo gasto
 */
function initNuevoGasto() {
    //id del siniestro actual
    var idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    //Titulo de pantalla
    var titleApp = window.localStorage.getItem("titleApp");
    fn.load('nuevoReporteGasto.html').then(() => {
        if (idSiniestro != null && idSiniestro != '' && idSiniestro != '0') {
            document.querySelector('[data-ajustador-id]').value = window.localStorage.getItem("idUser");;
            document.querySelector('[data-ajustador-id-defecto]').value = window.localStorage.getItem("idUser");
            document.querySelector('[data-seleccionar-ajustador]').style.display = 'none';
            document.querySelector('[data-limpiar-ajustador]').style.display = 'none';
        } else {
            document.querySelector('[data-cambiar-ajustador]').style.display = 'none'
            document.querySelector('[data-limpiar-ajustador]').style.display = 'none';
        }
    })
    showLoading();
    //Se obtienen los datos del siniestro
    showLoading();
    sqlQuery('SELECT * FROM Siniestro WHERE caso_id = ?', [idSiniestro], function (datosSiniestro) {
        var html = '';
        if (datosSiniestro != true) {
            if (datosSiniestro[0].caso_n_siniestro != null && datosSiniestro[0].caso_n_siniestro != undefined) {
                html += '<td><strong>Siniestro N°</strong></td>'
                    + '<td>' + datosSiniestro[0].caso_n_siniestro + '</td>';
            }
            $('#siniestroExiste').html(html);
            $('#gastos_repor_caso').val(datosSiniestro[0].caso_id);
            $('#titleApp').html(titleApp);
        }
        hideLoading();
    });

    //Se obtiene el catálogo de moneda
    showLoading();
    sqlQuery('SELECT * FROM CatalogoMoneda WHERE moneda_estado = ? ORDER BY moneda_nombre ASC', [1], function (monedas) {
        if (monedas != true) {
            var selectMonedas = '';
            selectMonedas += '<ons-select id="gasto_moneda" required>';
            selectMonedas += '<option value="" >Seleccione una opción ...</option>';
            monedas.forEach(function (moneda) {
                selectMonedas += '<option value="' + moneda.moneda_id + '" >' + moneda.moneda_nombre + '</option>';
            });
            selectMonedas += '</ons-select>';
            $('#gastos_moneda').html(selectMonedas);
            validateNuevoRepGasto();
        }
        hideLoading();
    });
    //Se obtienen los datos del usuario
    CatalogoService.obtenerDatosUsuarioActual().then(datosUsuario => {
        $('[data-ajustador-nombre]').val(datosUsuario.user_nombre);
        $('[data-ajustador-nombre-defecto]').val(datosUsuario.user_nombre);
        $('[data-ajustador-iniciales]').val(datosUsuario.user_iniciales);
        $('[data-ajustador-iniciales-defecto]').val(datosUsuario.user_iniciales);
    })
}

/**
 * Función que inicializa las validaciones
 * para el formulario
 * de agregar un nuevo reporte gasto
 */
function validateNuevoRepGasto() {
    $('#nuevoRepoGasto').validate({
        errorClass: "errorForm",
        validClass: "validForm",
        submitHandler: function () {
            guardarNuevoGasto();
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
 * de nuevo reporte gasto
 */
function submitRepoGasto() {
    $('#nuevoRepoGasto').submit();
}

/**
 * Función para guardar un nuevo
 * gasto
 */
function guardarNuevoGasto() {
    var params;
    var arrayParams = new Array();
    var idMoneda = $('#gasto_moneda').val();
    var caso_gasto = window.localStorage.getItem("idSiniestroServidor");
    var pageIni = window.localStorage.getItem("lastPageGasto") ? window.localStorage.getItem("lastPageGasto") : 1;
    var totalRegGastos = window.localStorage.getItem("totalRegGastos");
    document.getElementById('btnCrearReporteGasto').setAttribute('disabled', 'disabled');
    document.getElementById('btnCrearReporteGasto').insertAdjacentHTML('beforeend', `<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>`)
    sqlQuery('SELECT * FROM Gasto WHERE correspon_caso = ? ORDER BY gastos_repor_id DESC', [caso_gasto ? caso_gasto : 0], function (gastoConsecu) {
        if (gastoConsecu != true) {
            totalRegGastos = totalRegGastos ? totalRegGastos : gastoConsecu.length;
            getMonedaPorId(idMoneda, function (moneda) {
                sqlQuery('SELECT COUNT(*) FROM Gasto WHERE page = ? AND correspon_caso = ?', [pageIni, caso_gasto ? caso_gasto : 0], function (regPage) {
                    //Se verifica si el ajustador actual tiene un siniestro
                    if (caso_gasto != null && caso_gasto != undefined) {
                        params = getGastoParams(totalRegGastos, moneda.moneda_nombre);
                    } else {
                        params = getGastoParams(0, moneda.moneda_nombre, true);
                    }

                    GastosService.obtenerSiguienteConsecutivo(caso_gasto)
                        .then(consecutivo => {

                            params.gastos_repor_consecu = consecutivo
                            gastoLog.debug('guardando nuevo gasto consecutivo', params);
                            arrayParams = fn.JsonToArray(params);
                            //Se verifica la cantidad de registros por página
                            if (regPage) {
                                if (regPage[0]["COUNT(*)"] < 20) {
                                    arrayParams.push(pageIni);
                                } else {
                                    window.localStorage.removeItem("lastPageGasto");
                                    pageIni++;
                                    window.localStorage.setItem("lastPageGasto", pageIni);
                                    arrayParams.push(pageIni);
                                }
                            }
                            sqlQuery(insertGasto, arrayParams, function (idUltimoGasto) {
                                if (idUltimoGasto) {
                                    guardarPeticionPromise('ajustador_gastos.php', 'POST', 'Gasto', 'idGasto', idUltimoGasto).then(r => {
                                        var totalRegGastos = window.localStorage.getItem("totalRegGastos");
                                        window.localStorage.removeItem("totalRegGastos");
                                        totalRegGastos++;
                                        window.localStorage.setItem("totalRegGastos", totalRegGastos);
                                        updatePagesGasto(function (success) { //Se actualiza la paginación
                                            showSuccess("Se ha generado el nuevo reporte correctamente");
                                            verReporteGasto(null, idUltimoGasto);
                                        });
                                    }).catch(error => {
                                        gastoLog.error('Error al guardar peticion de gasto', error)
                                        showError("Ha ocurrido un error, intentelo más tarde");
                                    })
                                }
                            }, true)
                        })
                })
            });
        } else {
            totalRegGastos = totalRegGastos ? totalRegGastos : 0;
            getMonedaPorId(idMoneda, function (moneda) {
                sqlQuery('SELECT COUNT(*) FROM Gasto WHERE page = ? AND correspon_caso = ?', [pageIni, caso_gasto ? caso_gasto : 0], function (regPage) {
                    if (caso_gasto != null && caso_gasto != undefined) {
                        params = getGastoParams(totalRegGastos, moneda.moneda_nombre);
                    } else {
                        params = getGastoParams(0, moneda.moneda_nombre, true);
                    }
                    GastosService.obtenerSiguienteConsecutivo(caso_gasto)
                        .then(consecutivo => {
                            params.gastos_repor_consecu = consecutivo
                            gastoLog.debug('guardando nuevo gasto no consecutivo', params);
                            arrayParams = fn.JsonToArray(params);
                            if (regPage) {
                                if (regPage[0]["COUNT(*)"] < 20) {
                                    arrayParams.push(pageIni);
                                } else {
                                    window.localStorage.removeItem("lastPageGasto");
                                    pageIni++;
                                    window.localStorage.setItem("lastPageGasto", pageIni);
                                    arrayParams.push(pageIni);
                                }
                            }
                            sqlQuery(insertGasto, arrayParams, function (idUltimoGasto) {
                                if (idUltimoGasto) {
                                    guardarPeticion('ajustador_gastos.php', 'POST', 'Gasto', 'idGasto', idUltimoGasto, function (inserted) {
                                        if (inserted) {
                                            var totalRegGastos = window.localStorage.getItem("totalRegGastos");
                                            window.localStorage.removeItem("totalRegGastos");
                                            totalRegGastos++;
                                            window.localStorage.setItem("totalRegGastos", totalRegGastos);
                                            updatePagesGasto(function (success) { //Se actualiza la paginación
                                                showSuccess("Se ha generado el nuevo reporte correctamente");
                                                verReporteGasto(null, idUltimoGasto);
                                            });
                                        } else {
                                            showError("Ha ocurrido un error, intentelo más tarde");
                                        }
                                    });
                                }
                            }, true);
                        })
                });
            });
        }
    });
}

/**
 * Función para actualizar la paginación de
 * los gastos
 * @param {*} callback 
 */
function updatePagesGasto(callback) {
    var idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    var limitGastoUsuario = window.localStorage.getItem("limitGastoUsuario");
    var elementosPorPagina = 20;
    if (idSiniestro == null) {
        elementosPorPagina = 10;
    }
    gastoLog.debug('actualizando paginacion de los gatos limite:', limitGastoUsuario);
    sqlPromise('SELECT * FROM Gasto WHERE gastos_repor_caso = ? ORDER BY gastos_repor_consecu ASC', [idSiniestro != null ? idSiniestro : 0]).then(rowsAsList)
        .then(gastos => {
            let promesas = [];
            let pagina = 0;
            for (let i = 0; i < gastos.length; i += 1) {
                if (i % elementosPorPagina == 0)
                    pagina += 1;
                var promesa = sqlPromise('UPDATE Gasto SET page = ? WHERE idGasto = ?', [pagina, gastos[i].idGasto])
                promesas.push(promesa)
            }
            return Promise.all(promesas)
        })
        .catch(e => gastoLog.error('No se pudo actualizar la lista ', e))
        .finally(callback)
}

/**
 * Funcion para obtener los parametros
 * de un
 */
function getGastoParams(consecutivo, moneda, onlyAjustador) {
    var repor_caso = $('#gastos_repor_caso').val();
    var repor_moneda = moneda;
    var repor_anticipo = $('#gastos_repor_anticipo').val();
    var repor_fecha = obtenerFecha(new Date);
    var gastos_repor_ajustador = $('#ajustador_id').val() != '' ? $('#ajustador_id').val() : window.localStorage.getItem("idUser");
    var ajustador = $('#user_iniciales').val();
    if (repor_caso != null && repor_caso != undefined && $.trim(repor_caso) != "") {
        var repor_nombre = repor_caso + '-' + ajustador + '-' + numeral(consecutivo + 1).format('000');
    } else {
        var repor_nombre = ajustador + '-' + numeral(consecutivo + 1).format('000');
    }
    var correspon_caso = window.localStorage.getItem('idSiniestroServidor');
    if (onlyAjustador != true) {
        consecutivo++;
    }

    var gasto = {
        gastos_repor_id: null,
        gastos_repor_caso: repor_caso ? repor_caso : 0,
        gastos_repor_consecu: consecutivo,
        gastos_repor_user: null,
        gastos_repor_ajustador: gastos_repor_ajustador,
        gastos_repor_moneda: repor_moneda,
        gastos_repor_anticipo: repor_anticipo,
        gastos_repor_nombre: repor_nombre,
        gastos_repor_f_ini: null,
        gastos_repor_f_fin: null,
        gastos_repor_mail: null,
        gastos_repor_coment: null,
        gastos_repor_fecha_envi: null,
        gastos_repor_fecha: repor_fecha,
        ajustador: ajustador,
        correspon_caso: correspon_caso ? correspon_caso : 0
    }
    return gasto;
}

/**
 * Función para actualizar el anticipo del gasto
 */
function updateAnticipo() {
    gastoLog.debug('actualizando anticipo');
    var anticipo = $('#inpAnticipo').val();
    var idGasto = $('#idGasto').val();
    sqlQuery('UPDATE Gasto SET gastos_repor_anticipo = ?, changeLocal = ? WHERE idGasto = ?', [anticipo, true, idGasto], function(results){
        if(results == true){
            guardarPeticion('ajustador_gastos.php', 'put', 'Gasto', 'idGasto', idGasto);
            showSuccess('Se ha actualizado el anticipo correctamente');
        }
    });
}

/**
 * Función que inicializa el modal
 * para enviar los gastos
 */
function initSendGastos() {
    fn.load('sendGastos.html')
}

/**
 * Función que valida el formulario para enviar 
 * los gastos en correo
 */
function validateGastosReport() {
    $('#sendGastosReport').validate({
        errorClass: "errorForm",
        validClass: "validForm",
        submitHandler: function () {
            var emailsValid = checkEmails('emails');
            if (emailsValid == true) {
                sendMail();
            } else {
                $('#emails').removeClass('validForm');
                $('#emails').addClass('errorForm');
                if (emailsValid.length == 1) {
                    showError("E-mail inválido: " + emailsValid.toString());
                } else {
                    showError("E-mails inválidos: " + emailsValid.toString());
                }
            }
        },
        invalidHandler: function (event, validator) {
            if (validator.numberOfInvalids()) {
                showError("Revisa los campos marcados");
            }
        }
    });
}

/**
 * Función para hacer submit al
 * formulario para enviar un correo
 */
function submitValidateGastosReport() {
    $('#sendGastosReport').submit();
}

/**
 * Función para enviar mails
 * con los gastos correspondientes
 */
function sendMail() {
    var fech_ini = $('#fech_ini').val();
    var fech_fin = $('#fech_fin').val();
    var gastos_repor_mail = $('#emails').val();
    var gastos_repor_coment = $('#coment').val();
    var gastos_repor_id_anti;
    var gastos_repor_nombre;
    var idGasto = window.localStorage.getItem("idGasto");
    var nombreGastoProv = window.localStorage.getItem("tituloGasto");
    nombreGastoProv = nombreGastoProv.split("°")[1];
    var idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    idSiniestro = idSiniestro ? idSiniestro : 0;

    sqlQuery('SELECT * FROM Gasto WHERE idGasto = ?', [idGasto], function (gasto) {
        if (gasto != true) {
            gastos_repor_id_anti = gasto[0].gastos_repor_id;
            gastos_repor_nombre = gasto[0].gastos_repor_nombre;
        }
        var mailParams = {
            anio: fech_ini.split("-")[0],
            mes: fech_ini.split("-")[1],
            dia: fech_ini.split("-")[2],
            anio_2: fech_fin.split("-")[0],
            mes_2: fech_fin.split("-")[1],
            dia_2: fech_fin.split("-")[2],
            gastos_repor_nombre: gastos_repor_nombre ? gastos_repor_nombre : nombreGastoProv,
            gastos_repor_mail: gastos_repor_mail,
            gastos_repor_coment: gastos_repor_coment,
            gastos_repor_id_anti: gastos_repor_id_anti ? gastos_repor_id_anti : idGasto,
            siniestro: idSiniestro,
            idGasto: idGasto
        }
        gastoLog.debug('enviar correo', mailParams);

        if (verificarConexion() == true) {
            sqlQuery('INSERT INTO SendMailGasto (anio,'
                + ' mes,'
                + ' dia,'
                + ' anio_2,'
                + ' mes_2, '
                + 'dia_2, '
                + 'gastos_repor_nombre, '
                + 'gastos_repor_mail, '
                + 'gastos_repor_coment, '
                + 'gastos_repor_id_anti, '
                + 'siniestro,'
                + 'fk_idGasto) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                fn.JsonToArray(mailParams), function (last_id) {
                    guardarPeticion('envio_reporte.php', 'POST', 'SendMailGasto', 'idMail', last_id, function (success) {
                        showNotice('El correo se enviará en un momento');
                        backReporteGasto();
                        syncLocalData('sync');
                    });
                }, true);
        } else {
            sqlQuery('INSERT INTO SendMailGasto (anio,'
                + ' mes,'
                + ' dia,'
                + ' anio_2,'
                + ' mes_2, '
                + 'dia_2, '
                + 'gastos_repor_nombre, '
                + 'gastos_repor_mail, '
                + 'gastos_repor_coment, '
                + 'gastos_repor_id_anti, '
                + 'siniestro,'
                + 'fk_idGasto) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                fn.JsonToArray(mailParams), function (last_id) {
                    guardarPeticion('envio_reporte.php', 'POST', 'SendMailGasto', 'idMail', last_id, function (success) {
                        showNotice('El correo se enviará en cuanto exista una conexión a Internet disponible');
                        backReporteGasto();
                    });
                }, true);
        }
    });
}

/**************************************************************
                    * DETALLE DE GASTO*
 **************************************************************/


/**
 * Funcion para regresar a gastos
 */
function backReporteGasto() {
    // si esta en la pantalla de nuevo gasto y esta eligiendo un ajustador
    // se debe ocultar la seleccion del ajustador
    let seleccionAjustador = document.getElementById('seleccionarAjustador');
    if (seleccionAjustador != null && seleccionAjustador.style.display == 'block') {
        document.querySelectorAll('ons-card').forEach(card => card.style.display = 'block');
        document.getElementById('seleccionarAjustador').style.display = 'none';
        return;
    }
    var idGasto = window.localStorage.getItem("idGasto");
    window.localStorage.removeItem("comprob1");
    verReporteGasto(null, idGasto);
}

/**
 * Función que inicializa los datos
 * del formulario para agregar un
 * nuevo detalle gastos
 */
function initNuevoDetalle() {
    let titleApp = window.localStorage.getItem("titleApp");
    let idSiniestro = window.localStorage.getItem("idSiniestroServidor");
    return cargarPagina()
        .then(mostrarConceptos)
        .then(mostrarDatosUsuario);

    function cargarPagina() {
        return fn.load('detalleReporteGasto.html').then(() => {
            document.querySelector('[data-seleccionar-ajustador]').style.display = 'none';
            document.querySelector('[data-limpiar-ajustador]').style.display = 'none';
        })
    }

    function mostrarConceptos() {
        return CatalogoService.obtenerListadoConceptos().then(conceptos => {
            let selectConceptos = '';
            let monedaGasto = window.localStorage.getItem("monedaGasto");
            selectConceptos += '<ons-select id="select_conceptos" name="select_conceptos" required>';
            conceptos.forEach(function (concepto) {
                selectConceptos += '<option value="' + concepto.concepto_id + '" >' + concepto.concepto_tex + '</option>';
            });
            selectConceptos += '</ons-select>'
            $('#gastos_concepto').html(selectConceptos);
            $('#titleApp').html(titleApp);
            $('#titlePage').html('Nuevo Gasto');
            $('#gastos_moneda').html(monedaGasto);
        });
    }

    function mostrarDatosUsuario() {
        return CatalogoService.obtenerDatosUsuarioActual().then(datosUsuario => {
            $('[data-ajustador-nombre]').val(datosUsuario.user_nombre);
            $('[data-ajustador-nombre-defecto]').val(datosUsuario.user_nombre);
            $('[data-ajustador-iniciales]').val(datosUsuario.user_iniciales);
            $('[data-ajustador-iniciales-defecto]').val(datosUsuario.user_iniciales);
            $('[data-ajustador-id]').val(datosUsuario.user_id);
            $('[data-ajustador-id-defecto]').val(datosUsuario.user_id);
            $('#gastos_fecha_real').val(obtenerFecha(new Date()));
        }).finally(() => {
            loadActionSheet('imageOptions.html');
            TablaDetalleGasto.optionsDetalleGasto('nuevo');
            validateNuevoDetalleGasto();
        })
    }
}

/**
 * Función que valida el formulario para agregar
 * un nuevo detalle gasto
 */
function validateNuevoDetalleGasto() {
    $('#nuevoDetalleGasto').validate({
        errorClass: "errorForm",
        validClass: "validForm",
        submitHandler: function () {
            var photo = $('#gastos_archivo').val();
            if (photo.trim() != '') {
                var accionSig;
                if (salir == true) {
                    accionSig = 'salir';
                } else {
                    accionSig = 'nuevo';
                }
                // guardarNuevoDetalle(accionSig);
                TablaDetalleGasto.guardarNuevoDetalle(accionSig);
            } else {
                showError('Se debe cargar la fotografía del comprobante');
            }
        },
        invalidHandler: function (event, validator) {
            if (validator.numberOfInvalids()) {
                showError("Revisa los campos marcados");
            }
        }
    });
}

function submitNuevoDetalleSalir() {
    salir = true;
    $('#nuevoDetalleGasto').submit();
}

function submitNuevoDetalleNuevo() {
    salir = false;
    $('#nuevoDetalleGasto').submit();
}


function detalleGastoToJson(detalleGasto) {
    var params = {
        gastos_movil_caso: detalleGasto.gastos_movil_caso,
        anio: detalleGasto.anio,
        mes: detalleGasto.mes,
        dia: detalleGasto.dia,
        gastos_ajustador: detalleGasto.gastos_ajustador,
        gastos_repor_id: detalleGasto.gastos_repor_id,
        gastos_valor: detalleGasto.gastos_valor,
        gastos_cargar: detalleGasto.gastos_cargar,
        gastos_moneda: detalleGasto.gastos_moneda,
        gastos_emisor: detalleGasto.gastos_emisor,
        gastos_descripcion: detalleGasto.gastos_descripcion,
        gastos_concepto: detalleGasto.gastos_concepto,
        gastos_razon_social: detalleGasto.gastos_razon_social,
        gastos_amex: detalleGasto.gastos_amex,
        dataUri: detalleGasto.up_documento_2
    }
    return params;
}

function documentoGastoToJson(documentoGasto) {
    var documentoGastoJson = {
        gasto_id: documentoGasto.gasto_id,
        filetype: documentoGasto.filetype,
        up_documento: documentoGasto.up_documento,
        dataUri: documentoGasto.up_documento
    }
    return documentoGastoJson;
}

function showModalGastos() {
    var modal = document.querySelector('ons-modal');
    modal.show();
}

function ListadoAjustadores() {
    return CatalogoService.obtenerListadoAjustadores().then(ajustadores => {
        let items = ajustadores.map(ajustador => `
            <ons-list-item data-id='${ajustador.id}' data-nombre='${ajustador.nombre}' 
                    data-iniciales='${ajustador.iniciales}'>
                ${ajustador.nombre}
            </ons-list-item>
        `).join('')
        document.querySelector('[data-seleccionar-ajustador] ons-list').innerHTML = items;
        document.querySelector('[data-seleccionar-ajustador]').style.display = 'block';
        document.querySelector('[data-seleccionar-ajustador] input').oninput = filtrarListado;
        document.querySelectorAll('[data-seleccionar-ajustador] ons-list-item').forEach(item => {
            item.onclick = e => seleccionarAjustador(item);
        })
        document.querySelector('[data-seleccionar-ajustador] input').value = '';
        document.querySelectorAll('ons-card').forEach(card => card.style.display = 'none');
    })

    function seleccionarAjustador(item) {
        document.querySelectorAll('ons-card').forEach(card => card.style.display = 'block');
        document.querySelector('[data-seleccionar-ajustador]').style.display = 'none';
        document.querySelector('[data-ajustador-id]').value = item.dataset.id;
        document.querySelector('[data-ajustador-nombre]').value = item.dataset.nombre;
        document.querySelector('[data-ajustador-iniciales]').value = item.dataset.iniciales;
        document.querySelector('[data-limpiar-ajustador]').style.display = 'inline';
        document.querySelector('[data-limpiar-ajustador]').onclick = limpiarAjustadorSeleccionado;
    }

    function limpiarAjustadorSeleccionado() {
        document.querySelector('[data-limpiar-ajustador]').style.display = 'none';
        document.querySelector('[data-ajustador-nombre]').value =
            document.querySelector('[data-ajustador-nombre-defecto]').value;
        document.querySelector('[data-ajustador-iniciales]').value =
            document.querySelector('[data-ajustador-iniciales-defecto]').value;
        if (document.querySelector('[data-ajustador-id-defecto]') == null) {
            document.querySelector('[data-ajustador-id-defecto]').value = '';
        } else {
            document.querySelector('[data-ajustador-id]').value =
                document.querySelector('[data-ajustador-id-defecto]').value;
        }
    }

    function filtrarListado() {
        let busqueda = document.querySelector('[data-seleccionar-ajustador] input').value;
        if (busqueda.trim() != '') {
            document.querySelectorAll('[data-seleccionar-ajustador] ons-list-item').forEach(item => {
                let nombreUpper = item.dataset.nombre.toUpperCase();
                let busquedaUpper = busqueda.toUpperCase();
                if (nombreUpper.includes(busquedaUpper)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        } else {
            document.querySelectorAll('[data-seleccionar-ajustador] ons-list-item').forEach(item => {
                item.style.display = 'block';
            });
        }
    }
}