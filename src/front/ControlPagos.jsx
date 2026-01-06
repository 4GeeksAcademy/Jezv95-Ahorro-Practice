import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ControlPagos = () => {
  const [metaTotal, setMetaTotal] = useState(3720000);
  const [montoCuota, setMontoCuota] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const generarPDF = () => {
    const doc = new jsPDF();
    
    // Título y Encabezado
    doc.setFontSize(18);
    doc.text('Reporte de Control de Meta Grupal', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Fecha del reporte: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Resumen General
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumen General', 14, 40);
    
    const resumenData = [
      ['Meta Total', `$${metaTotal.toLocaleString()}`],
      ['Total Recaudado', `$${totalRecaudado.toLocaleString()}`],
      ['Restante', `$${(metaTotal - totalRecaudado).toLocaleString()}`],
      ['Progreso', `${porcentajeTotal.toFixed(2)}%`]
    ];

    doc.autoTable({
      startY: 45,
      head: [['Concepto', 'Monto / Valor']],
      body: resumenData,
      theme: 'striped',
      headStyles: { fillColor: [13, 110, 253] } // Azul Bootstrap
    });

    // Detalle por Participante
    doc.text('Detalle por Participante', 14, doc.lastAutoTable.finalY + 15);

    const detalleParticipantes = participantes.map(p => [
      p.nombre,
      `$${p.cuotaMensual.toLocaleString()}`,
      p.pagos.length,
      `$${p.pagos.reduce((sum, pg) => sum + pg.monto, 0).toLocaleString()}`
    ]);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Nombre', 'Cuota Mensual', 'Cant. Pagos', 'Total Aportado']],
      body: detalleParticipantes,
      theme: 'grid',
      headStyles: { fillColor: [108, 117, 125] } // Gris Bootstrap
    });

    // Pie de página
    doc.setFontSize(10);
    doc.text('Reporte generado automáticamente por Sistema de Control de Pagos.', 14, doc.internal.pageSize.height - 10);

    doc.save(`Reporte_Meta_Grupal_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- LÓGICA DE PERSISTENCIA ---
  
  // Inicializamos el estado intentando leer de LocalStorage
  const [participantes, setParticipantes] = useState(() => {
    const datosGuardados = localStorage.getItem('controlPagos_participantes');
    if (datosGuardados) {
      return JSON.parse(datosGuardados);
    } else {
      // Datos iniciales si no hay nada guardado
      return [
        { id: 1, nombre: 'Elio', cuotaMensual: 70000, pagos: [], color: 'bg-primary' },
        { id: 2, nombre: 'Manu E', cuotaMensual: 70000, pagos: [], color: 'bg-success' },
        { id: 3, nombre: 'Manu A', cuotaMensual: 70000, pagos: [], color: 'bg-info' },
        { id: 4, nombre: 'Chue', cuotaMensual: 30000, pagos: [], color: 'bg-warning' },
        { id: 5, nombre: 'German', cuotaMensual: 70000, pagos: [], color: 'bg-danger' },
      ];
    }
  });

  // Guardar en LocalStorage cada vez que cambien los participantes
  useEffect(() => {
    localStorage.setItem('controlPagos_participantes', JSON.stringify(participantes));
  }, [participantes]);

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  // --- FUNCIONES ---

  const agregarPago = (id) => {
    const valor = parseFloat(montoCuota);
    if (isNaN(valor) || valor <= 0) return alert("Monto no válido");

    const nuevosParticipantes = participantes.map(p => {
      if (p.id === id) {
        const nuevoRegistro = { monto: valor, fecha: fechaPago };
        return { ...p, pagos: [...p.pagos, nuevoRegistro] };
      }
      return p;
    });

    setParticipantes(nuevosParticipantes);
    setMontoCuota('');
    // Actualizar el modal con los datos frescos
    setUsuarioSeleccionado(nuevosParticipantes.find(p => p.id === id));
  };

  const eliminarPago = (pagoAEliminar) => {
    if (!window.confirm("¿Eliminar registro?")) return;
    const nuevosParticipantes = participantes.map(p => {
      if (p.id === usuarioSeleccionado.id) {
        return { ...p, pagos: p.pagos.filter(pago => pago !== pagoAEliminar) };
      }
      return p;
    });
    setParticipantes(nuevosParticipantes);
    setUsuarioSeleccionado(nuevosParticipantes.find(p => p.id === usuarioSeleccionado.id));
  };

  // --- CÁLCULOS ---
  const totalRecaudado = participantes.reduce((acc, p) => acc + p.pagos.reduce((sum, pg) => sum + pg.monto, 0), 0);
  const restanteMeta = metaTotal - totalRecaudado;
  const porcentajeTotal = Math.min((totalRecaudado / metaTotal) * 100, 100);

  const pieData = [
    { name: 'Recaudado', value: totalRecaudado },
    { name: 'Restante', value: Math.max(0, restanteMeta) },
  ];
  const COLORS = ['#0d6efd', '#e9ecef'];

  return (
    <div className="container py-4" style={{ maxWidth: '700px' }}>
      <h2 className="text-center mb-4 fw-bold">💃🏽 Control Cuotas Negrita 💃🏽</h2>

      {/* GRÁFICO CIRCULAR */}
      <div className="card shadow-sm mb-4 border-0 rounded-4">
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={80}
                paddingAngle={5} dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-2">
            <h4 className="fw-bold text-primary mb-0">${totalRecaudado.toLocaleString()}</h4>
            <small className="text-muted">recaudado de ${metaTotal.toLocaleString()}</small>
          </div>
            
        </div>
        {/* // Dentro del return, arriba de la tarjeta del gráfico: */}
        
       
        
      </div>


      {/* LISTADO DE PERSONAS */}
      <div className="list-group shadow-sm rounded-4 overflow-hidden">
        {participantes.map((p) => {
          const totalPagado = p.pagos.reduce((sum, pg) => sum + pg.monto, 0);
          const metaInd = p.cuotaMensual * 12;
          const porcentajeInd = Math.min((totalPagado / metaInd) * 100, 100);

          return (
            <button 
              key={p.id}
              onClick={() => setUsuarioSeleccionado(p)}
              className="list-group-item list-group-item-action border-0 py-3"
            >
              <div className="d-flex justify-content-between mb-1">
                <span className="fw-bold">{p.nombre}</span>
                <span className="fw-bold text-muted">${totalPagado.toLocaleString()}</span>
              </div>
              <div className="progress" style={{ height: '8px' }}>
                <div className={`progress-bar ${p.color}`} style={{ width: `${porcentajeInd}%` }}></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* MODAL (Simulado con clases Bootstrap) */}
      {usuarioSeleccionado && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Historial: {usuarioSeleccionado.nombre}</h5>
                <button type="button" className="btn-close" onClick={() => setUsuarioSeleccionado(null)}></button>
              </div>
              
              <div className="modal-body">
                {/* FORMULARIO AGREGAR */}
                <div className="p-3 bg-light rounded-3 mb-4 border">
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="small fw-bold text-muted">Monto</label>
                      <input 
                        type="number" className="form-control" placeholder="$0"
                        value={montoCuota} onChange={(e) => setMontoCuota(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="small fw-bold text-muted">Fecha</label>
                      <input 
                        type="date" className="form-control text-muted"
                        value={fechaPago} onChange={(e) => setFechaPago(e.target.value)}
                      />
                    </div>
                    <button className="btn btn-primary w-100 fw-bold mt-3 py-2" onClick={() => agregarPago(usuarioSeleccionado.id)}>
                      Registrar Pago
                    </button>
                  </div>
                </div>

                {/* HISTORIAL */}
                <p className="small fw-bold text-uppercase text-muted mb-2">Últimos Movimientos</p>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {[...usuarioSeleccionado.pagos].reverse().map((pago, idx) => (
                    <div key={idx} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <div>
                        <div className="fw-bold text-success">+ ${pago.monto.toLocaleString()}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{pago.fecha}</div>
                      </div>
                      <button className="btn btn-sm btn-light text-danger" onClick={() => eliminarPago(pago)}>✕</button>
                    </div>
                  ))}
                  {usuarioSeleccionado.pagos.length === 0 && <p className="text-center text-muted py-3">Sin pagos aún</p>}
                </div>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-dark w-100 py-2 rounded-3" onClick={() => setUsuarioSeleccionado(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPagos;