"use strict";

/**
 * Objeto para mostrar el listado de peticiones
 * @class
 */
const ListadoPeticiones = {
    mostrarSoloPendiente: true,
    caso: '',
    /**
     * Carga la pantalla de estatus de peticiones 
     * y muestra la tabla de peticiones.
     * Solo muestra las peticiones pendientes
     */
    mostrarPeticiones() {
        let wifiDisponible = navigator.connection.type == "wifi";
        return fn.load("estatusPeticiones.html").then(() => {
            this.mostrarSoloPendiente = true;
            // agregar eventos al momento de cambiar solo lo pendiente
            let selectMostrar = document.querySelector('[data-mostrar-selector] > select');
            selectMostrar.onchange = e => {
                this.mostrarSoloPendiente = e.target.value == 'pendiente';
                this.actualizarListado(e.target.value)
            };
            this.actualizarListado();
        })
    },

    /**
     * Actualiza el lista en la pantall de sincronizacion y en el modal
     */
    actualizarListado(caso) {
        let listadoPantalla = document.getElementById('listaPeticiones');
        let listadoModal = document.getElementById('sincronizarPendiente')
            .querySelector('[data-listado-peticiones]');     
        let obtenerCasos = Promise.resolve([this.caso]);
        if (this.caso == null || this.caso == "") {// muestra todos los casos
            console.log('caso vacio')
            obtenerCasos = PeticionesDao.obtenerCasosConPeticionesPendientes();
        }
        return obtenerCasos.then(casos => {
            console.error('casos obtenidos', casos)
            // crear el listado por cada caso
            let promesasTablas = casos.map(caso => this.generarTablaParaCaso(caso));
            Promise.all(promesasTablas).then(partes => {
                return partes.join(' ');
            }).then(tbody => {
                // generar una tabla con los listados anteriores
                let tabla = `
                    <center>
                        <table class="table tableKronos table-striped table-sm shadow-sm m-0">
                            <tbody>${tbody}<tbody>
                        </table>
                    </center>`;
                if (listadoPantalla != null) // actualizar pantalla sincronizacion
                    listadoPantalla.innerHTML = tabla;
                if (listadoModal != null) // actualizar pantalla en el modal
                    listadoModal.innerHTML = tabla;
                // agregar eventos click en el icono de informacion
                document.querySelectorAll('[data-peticion]').forEach(boton => {
                    boton.onclick = e => {
                        this.mostrarInformacion(e.target.dataset.peticion,
                            e.target.dataset.titulo);
                    };
                })
            })
        })
    },

    /**
     * Genera una tabla para un caso dado
     * @param {string} caso 
     */
    generarTablaParaCaso(caso) {
        caso = caso == 'S/N' ? null : caso;
        let obtenerPeticiones = null;
        if (this.mostrarSoloPendiente) {
            obtenerPeticiones = PeticionesDao.obtenerPeticionesPendientesPorCaso(caso);
        } else {
            obtenerPeticiones = PeticionesDao.obtenerPeticionesPorCaso(caso);
        }
        return obtenerPeticiones.then(listado => {
            return this.agregarDescripciones(listado).then(peticiones => {
                if (peticiones.length == 0) { // no hay peticiones 
                    return ''
                }
                return `
                    <thead>
                        <tr><th colspan="3">Caso ${caso != null ? caso : 'S/N'}</th></tr>
                    <thead>
                    <tbody>
                        ${peticiones.map(p => this.formatearPeticion(p)).join(' ')}
                    </tbody>
                `
            })
        })
    },

    /**
     * Genera un <tr> con los datos de la peticion
     * @param {Peticion} p 
     */
    formatearPeticion(p) {
        let estado = '';
        if (p.estatus == 'OK') {
            estado = '<ons-icon style="color:#059b11;" icon="md-check"></ons-icon>';
        } else if (p.estatus == 'PEND') {
            estado = '<ons-icon style="color:#395dc0;" icon="md-forward"></ons-icon>';
        } else if (p.estatus == 'ERROR') {
            estado = '<ons-icon style="color:#c33613;" icon="md-block"></ons-icon>';
        }
        return p == null ? '' : `
            <tr>
                <td>${estado}</td>
                <td>${p.descripcion}</td>
                <td>
                    <ons-icon icon="md-info" 
                        data-titulo="${p.descripcion}" 
                        data-peticion="${p.idPeticion}">
                    </ons-icon>
                </td>
            </tr>`;
    },

    /**
     * Toma un listado de peticiones y les agrega una descripcion
     * @param {Array<Peticion>} peticiones 
     */
    agregarDescripciones(peticiones) {
        let promesas = [];
        for (let i = 0; i < peticiones.length; i++) {
            let peticion = peticiones[i];
            let promesa = Promise.resolve()
                .then(() => DescripcionPeticion[peticion.entidad](peticion));
            promesas.push(promesa)
        }
        return Promise.all(promesas).then(resultados => {
            console.error(resultados);
            return resultados
        })
    },

    /**
     * Muestra los detalles de una peticion en un modal con un titulo dado
     * @param {number} idPeticion 
     * @param {string} titulo
     * @returns {Promise}
     */
    mostrarInformacion(idPeticion, titulo) {
        console.error('idPeticion', idPeticion, 'titulo', titulo)
        let modalPeticion = document.getElementById('detallePeticion');
        modalPeticion.querySelector('[data-titulo]').innerHTML = titulo;
        return PeticionesDao.obtenerPeticion(idPeticion).then(peticion => {
            console.error('peticion', peticion);
            let obtenerHTML = Promise.resolve().then(() => {
                return FormatearPeticion[peticion.entidad](peticion)
            }).catch(error => {
                console.error('No se pudo formatear', error)
                return `${peticion.estatus  == 'OK' ? 
                    '<strong style="color: darkgreen">Estado: ' + peticion.estatus + '</strong>' : 
                    '<strong style="color: darkred">Estado: ' + peticion.estatus + '</strong>' 
                }`
            })
            return obtenerHTML.then(html => {
                    modalPeticion.show();
                    modalPeticion.querySelector('[data-detalle]').innerHTML = html;
                    if (peticion.estatus != null && peticion.estatus.toUpperCase() != 'OK') {
                        /** @type {HTMLButtonElement} */
                        let botonSincronizar = modalPeticion.querySelector('[data-sincronizar]');
                        botonSincronizar.style.display = 'block'
                        botonSincronizar.onclick = e => this.sincronizarPeticionIndividual(modalPeticion, idPeticion);
                    } else {
                        /** @type {HTMLButtonElement} */
                        let botonSincronizar = modalPeticion.querySelector('[data-sincronizar]');
                        botonSincronizar.style.display = 'none';
                    }
                    modalPeticion.querySelector('[data-cerrar]')
                        .onclick = e => modalPeticion.hide();
                    modalPeticion.querySelector('[data-request]')
                        .onclick = e => alert(peticion.request);
                    modalPeticion.querySelector('[data-response]')
                        .onclick = e => alert(peticion.response);       
            });
        })
    },

    /**
     * Funcion para sincronizar peticion individual
     * @param {Element} modal
     * @param {number} idPeticion
     */
    sincronizarPeticionIndividual(modal, idPeticion) {
        modal.querySelector('[data-icono-sincronizar]').classList.add('zmdi-hc-spin')
        return PeticionesDao.obtenerPeticion(idPeticion).then(peticion => { // obtener peticion
            return enviarPeticionesPendientes([peticion]).then(() => { // enviar peticion
                return PeticionesDao.obtenerPeticion(idPeticion).then(peticion => {
                    if (peticion.estatus == "OK") {
                        return this.actualizarListado;
                    } else if (verificarConexion()) { // no hay peticiones pendientes y tiene internet
                        this.salir()
                    } else {
                        // no hay peticiones pendientes, pero no tiene internet 
                        // se muestra una advertencia
                        createAlertDialog('logoutConfirmDialog', 'logoutConfirmDialog.html');
                    }
                })
            })
        }).catch(error => {
            showError('No se pudo sincronizar')
            peticionesLog.error('Error al sincronizar peticion individual', error)
        }).finally(() => {
            modal.querySelector('[data-icono-sincronizar]').classList.remove('zmdi-hc-spin');
            modal.hide();
            this.actualizarListado();
        })
    },
}
