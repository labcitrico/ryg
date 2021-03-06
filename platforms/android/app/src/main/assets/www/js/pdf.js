var pdfLog = getLogger('pdf');

function openPDF() {
	fn.load('pdf.html');
	var idInspeccion = window.localStorage.getItem("inspeccion_id");
	sqlQuery('SELECT fecha FROM Inspeccion WHERE tableInspeccionID = ?', [idInspeccion], function (results) {
		$('#idComentario').val('');
		if (results != true) {
			mostrarPDF(results);
		} else {
			showNotice("Ha ocurrido un error inesperado, intentelo mas tarde");
		}
	});
}

function mostrarPDF(data) {
	var date = data[0].fecha;
	date = date.split(" ")[0];
	$('#fechaIns').val(date);
}

function subirPDF() {
	document.getElementById('btnCrearInspeccionPdf').setAttribute('disabled', 'disabled');
    document.getElementById('btnCrearInspeccionPdf').insertAdjacentHTML('beforeend', `<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" style="margin-bottom: 2px;"></span>`)
	let documentos_caso = window.localStorage.getItem("idSiniestroServidor");
	documentos_caso = documentos_caso ? documentos_caso : window.localStorage.getItem("idSiniestroLocal");
	let documentoURI = document.getElementById("documento").value;
	let documentos_observaciones = $("#idComentario").val();
	if (documentoURI != null && documentoURI.trim() != "") {
		sqlPromise(`INSERT INTO Pdf (documentos_caso, up_documento, documentos_observaciones, mimetype) 
				VALUES (?,?,?,?)`, [documentos_caso, documentoURI, documentos_observaciones, 'application/pdf'])
			.then(r => r.insertId)
			.then(documentoId => guardarPeticionPromise(server + "documento.php", 'UPLOAD_PDF', 'Pdf', 'idPdf', documentoId))
			.then(() => {
				showSuccess("Se ha subido con exito el pdf");
				backVerInspeccion();
			})
			.catch(error => pdfLog.error('error al guardar pdf firmado', error))
	} else {
		showError("Debe cargar un documento");
	}
}

function pdfToJson(pdf) {
	var params = {
		documentos_caso: pdf.documentos_caso,
		documentos_observaciones: pdf.documentos_observaciones,
		up_documento: pdf.up_documento,
		dataUri: pdf.up_documento
	}
	return params;
}

/**
 * Dialogo para confimar cambios en inspeccion si no hay cambios se resuelve,
 * si el usuario elige cancelar se rechaza
 * @returns {Promise<any>}
 */
function dialogoComfirmarCambiosInspeccion() {
    let formulario = document.getElementById('formSiniestroSeleccionado');
    let formularioConCambios = formulario != null && formulario.dataset.cambio == 'true';
    if (!formularioConCambios) {
        return Promise.resolve();
    }
    return ons.notification.confirm('Cambios pendientes ??Desea guardarlos?', {
            title: 'Guardar inspecci??n',
            cancelable: true,
            buttonLabels: [
                'Cancelar', // opcion 0
                'Guardar' // opcion 1
            ]
    }).then(opcion => {
        if (opcion == 1) {
            return submitInspeccionSeleccionada();
        } else {
            return Promise.reject(0);
        }
    })
}

/**
 * Dialogo para editar el siniestro de la inspeccion cuando no hay datos de siniestro
 * @returns {Promise<any>}
 */
function dialogoEditarInspeccion() {
	return ons.notification.confirm('La informaci??n del siniestro no esta disponible' + 
		' ??Desea editar la informaci??n local?', {
		title: 'Informaci??n del siniestro',
		cancelable: true,
		buttonLabels: [
			'Cancelar', // opcion 0
			'Editar' // opcion 1
		]	
	}).then(opcion => {
		console.log('confirmacion', opcion)
		if (opcion == 1) {
			inspeccionHabilitarEditarSiniestro();
		}
	}).catch(error => {
		console.error('algo');
	})
}

/**
 * Detecta si al siniestre le falta informacion
 * @param {Siniestro} s 
 */
function faltanDatosSiniestro(s) {
	let faltaDatos = (s.caso_n_siniestro == null || s.caso_n_siniestro == '') 
		&& (s.asegurados == null || s.asegurados == '')
		&& (s.cia_seg == null || s.cia_seg == '')
		&& (s.causas == null || s.causas == '')
		&& (s.caso_fech_ocurren == null || s.caso_fech_ocurren == '')
	// si falta este dato, los datos no se obtuvieron del servidor
	let siniestroNoDisponible = s.estado_real == null || s.estado_real == '';
	console.error(s, faltaDatos, siniestroNoDisponible)
	return faltaDatos && siniestroNoDisponible;
}

/**
 * Funci??n que descarga el archivo PDF
 */
function downloadPDF() {
	// Obtiene la informaci??n para generar el pdf
	getDataSiniestro(function (infoSiniestro)  { // Datos del siniestro
		// Verificar informacion del siniestro
		let formulario = document.getElementById('formSiniestroSeleccionado');
		let formularioConCambios = formulario != null && formulario.dataset.cambio == 'true';
		let dialogos = Promise.resolve();
		if (formularioConCambios) {
			dialogos = dialogoComfirmarCambiosInspeccion();
		} else {
			if (faltanDatosSiniestro(infoSiniestro)) {
				dialogos.then(() => dialogoEditarInspeccion());
			} else {
				dialogos.then(() => obtenerPDF(infoSiniestro));
			}
		}
	});

	function obtenerPDF(infoSiniestro) {
		getDataInspeccion(function (infoDetalleInspeccion) { // Datos de la inspeccion
			getDatosUsuario(function (datosUsuario) { // Datos del usuario
				showNotice("Obteniendo fotograf??as...");
				getFotosInspeccion(function (listFotos) {
					if(listFotos != null && listFotos.length > 0) {
						showNotice("Generando documento, espere un momento...");
						reducePictureSize(listFotos).then(fotos => {
							generatePdfFromTemplate(infoSiniestro, infoDetalleInspeccion, datosUsuario, fotos);
						}).catch(error => console.error('[pdf]', 'error en fotos', error));
					} else {
						navigator.notification.confirm('La inspeccion no cuenta con fotograf??as, ??desea continuar?',
							function(results){
								if(results === 2) {
									showNotice("Generando documento, espere un momento...");
									generatePdfFromTemplate(infoSiniestro, infoDetalleInspeccion, datosUsuario, listFotos);
								}
							},
							'Acta de Inspecci??n',
							['Cancelar', 'Continuar']
						);
					}				
				});
			});
		});
	}
}

/**
 * Funcion para comprimir una lista de fotos de inspeccion
 * @param {Array<FotoInspeccion>} listaFotos 
 * @returns {Promise<Array<string|HTMLImageElement>>}
 */
function reducePictureSize(listaFotos) {
	pdfLog.debug('comprimiendo imagenes...');
	/**
	 *  @param {FotoInspeccion} foto 
	 *  @returns {Promise<HTMLImageElement>}
	*/
	function loadImage(foto) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			foto.img = img;
			img.addEventListener("load", () => resolve(foto));
			img.addEventListener("error", err => reject(err));
			if (device.platform == 'iOS') {
				img.src = foto.base64; // iOS utiliza el base64
			} else {
				img.src = foto.up_documento; // Android puede usar el file://..
			}
		}).catch(error => {
			showNotice('Algunas imagenes no se pudieron obtener')
			pdfLog.error('No se pudo comprimir la foto', error)
		})
	};	  
	
	var promesas = [];
	for (var i = 0; i < listaFotos.length; i++) {
		promesas.push(loadImage(listaFotos[i]))
	}
	return Promise.all(promesas).then(fotos => {
		for(var i=0; i < fotos.length; i++) {
			if (fotos[i] == null)
				continue;
			const height = 630;
			const scaleFactor = (height) / fotos[i].img.height;
			const width = fotos[i].img.width * scaleFactor;
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			ctx.width = 840;
			ctx.height = 630;
			canvas.width = 840;
			canvas.height = 630;
			console.log('[pdf]', {width, height});
			// centrar
			ctx.drawImage(fotos[i].img, (ctx.width / 2 - width / 2), 0, width, height);
			ctx.globalCompositeOperation = 'destination-over'
			// Now draw!
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			fotos[i].up_documento = canvas.toDataURL("image/jpeg", 0.9);
			delete fotos[i].img;
		}
		return fotos;
	});
}

function gotDir(dirEntry) {
	var fileName = window.localStorage.getItem("fileName");
	var url = window.localStorage.getItem("urlController");
	dirEntry.getFile(fileName, {
		create: true
	}, function (fileEntry) {
		download(fileEntry, url);
	});
}

function fail(error) {
	if (error.code != '12') {
		showError("errorFail: " + JSON.stringify(error));
	}
}

function download(fileEntry, uri) {
	var fileTransfer = new FileTransfer();
	var fileURL = fileEntry.toURL();
	fileTransfer.download(uri, fileURL, function (entry) {
			readBinaryFile(entry);
		},
		function (error) {
			showError("error: " + error.toString());
		},
		null, // or, pass false
		{
			headers: {
				"Authorization": "Bearer " + window.localStorage.getItem("tokenLogin")
			}
		}
	);
}

function readBinaryFile(fileEntry) {
	fileEntry.file(function (file) {
		var reader = new FileReader();
		reader.onloadend = function () {
			var blob = new Blob([new Uint8Array(this.result)], {
				type: "application/pdf"
			});
			writeFile(fileEntry, blob);
		};
		reader.readAsArrayBuffer(file);
	}, function (error) {
		showError("errorReadFile: " + JSON.stringify(error));
	});
}

function writeFile(fileEntry, dataObj) {
	// Create a FileWriter object for our FileEntry (log.txt).
	fileEntry.createWriter(function (fileWriter) {
		fileWriter.onwriteend = function () {
			showSuccess("Se ha descargado el documento " + fileEntry.name);
			abrirDocumentoConAplicacionDeTerceros(fileEntry.nativeURL, 'application/pdf')
		};
		fileWriter.onerror = function (e) {
			showError("Se ha producido un error al guardar el documento: " + e.toString());
		};
		fileWriter.write(dataObj);
	});
}