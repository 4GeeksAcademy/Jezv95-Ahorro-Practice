from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional

# 1. Configuración de Base de Datos (SQLite para este ejemplo)
SQLALCHEMY_DATABASE_URL = "sqlite:///./cuotas_negrita.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. Modelos de SQLAlchemy
class ParticipanteDB(Base):
    __tablename__ = "participantes"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    cuota_mensual = Column(Float)
    color = Column(String)
    pagos = relationship("PagoDB", back_populates="dueno")

class PagoDB(Base):
    __tablename__ = "pagos"
    id = Column(Integer, primary_key=True, index=True)
    monto = Column(Float)
    fecha = Column(String)
    participante_id = Column(Integer, ForeignKey("participantes.id"))
    dueno = relationship("ParticipanteDB", back_populates="pagos")

Base.metadata.create_all(bind=engine)

# 3. Esquemas Pydantic (Para recibir/enviar datos por la API)
class PagoCreate(BaseModel):
    monto: float
    fecha: str
    participante_id: int

class ParticipanteResponse(BaseModel):
    id: int
    nombre: str
    cuotaMensual: float
    color: str
    pagos: List[dict] = []
    class Config: from_attributes = True

app = FastAPI()

# Habilitar CORS para que React pueda conectarse
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Endpoints (Rutas de la API)
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@app.get("/participantes")
def listar_participantes(db: Session = Depends(get_db)):
    users = db.query(ParticipanteDB).all()
    # Transformamos al formato que ya usa tu React
    resultado = []
    for u in users:
        resultado.append({
            "id": u.id,
            "nombre": u.nombre,
            "cuotaMensual": u.cuota_mensual,
            "color": u.color,
            "pagos": [{"monto": p.monto, "fecha": p.fecha} for p in u.pagos]
        })
    return resultado

@app.post("/pagos")
def crear_pago(pago: PagoCreate, db: Session = Depends(get_db)):
    nuevo_pago = PagoDB(monto=pago.monto, fecha=pago.fecha, participante_id=pago.participante_id)
    db.add(nuevo_pago)
    db.commit()
    return {"status": "ok"}

@app.delete("/pagos/{participante_id}/{fecha}/{monto}")
def eliminar_pago(participante_id: int, fecha: str, monto: float, db: Session = Depends(get_db)):
    pago = db.query(PagoDB).filter(
        PagoDB.participante_id == participante_id,
        PagoDB.fecha == fecha,
        PagoDB.monto == monto
    ).first()
    if pago:
        db.delete(pago)
        db.commit()
        return {"status": "borrado"}
    raise HTTPException(status_code=404, detail="Pago no encontrado")

# Ejecutar con: uvicorn main:app --reload