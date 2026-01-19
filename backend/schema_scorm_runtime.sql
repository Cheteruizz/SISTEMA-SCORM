-- Tablas runtime + editor SCORM (nombres en espanol)
-- Compatible con MySQL 8.x

CREATE TABLE IF NOT EXISTS scorm_runtime_sesion (
  id_sesion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_proyecto BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NULL,
  id_manifest BIGINT UNSIGNED NULL,
  id_item BIGINT UNSIGNED NULL,
  id_recurso BIGINT UNSIGNED NULL,
  version_scorm VARCHAR(20) NOT NULL DEFAULT '1.2',
  ruta_lanzamiento VARCHAR(512) NULL,
  modo_entrada VARCHAR(20) NULL,
  modo_salida VARCHAR(20) NULL,
  credito VARCHAR(20) NULL,
  modo VARCHAR(20) NULL,
  estado_leccion VARCHAR(32) NULL,
  estado_completado VARCHAR(32) NULL,
  estado_exito VARCHAR(32) NULL,
  puntuacion_raw DECIMAL(10, 4) NULL,
  puntuacion_min DECIMAL(10, 4) NULL,
  puntuacion_max DECIMAL(10, 4) NULL,
  tiempo_total VARCHAR(32) NULL,
  tiempo_sesion VARCHAR(32) NULL,
  datos_suspendidos MEDIUMTEXT NULL,
  ubicacion VARCHAR(255) NULL,
  datos_lanzamiento MEDIUMTEXT NULL,
  id_aprendiz VARCHAR(100) NULL,
  nombre_aprendiz VARCHAR(255) NULL,
  ultimo_error VARCHAR(255) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sesion),
  KEY idx_sesion_proyecto (id_proyecto),
  KEY idx_sesion_usuario (id_usuario),
  KEY idx_sesion_item (id_item),
  KEY idx_sesion_recurso (id_recurso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scorm_runtime_cmi (
  id_sesion BIGINT UNSIGNED NOT NULL,
  clave_cmi VARCHAR(255) NOT NULL,
  valor_cmi MEDIUMTEXT NULL,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sesion, clave_cmi),
  KEY idx_cmi_clave (clave_cmi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scorm_runtime_interaccion (
  id_interaccion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sesion BIGINT UNSIGNED NOT NULL,
  interaccion_id VARCHAR(255) NOT NULL,
  tipo_interaccion VARCHAR(64) NULL,
  objetivos_ids VARCHAR(1024) NULL,
  respuesta_aprendiz MEDIUMTEXT NULL,
  resultado VARCHAR(64) NULL,
  ponderacion DECIMAL(10, 4) NULL,
  latencia VARCHAR(32) NULL,
  marca_tiempo VARCHAR(64) NULL,
  descripcion MEDIUMTEXT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_interaccion),
  KEY idx_interaccion_sesion (id_sesion),
  KEY idx_interaccion_id (interaccion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scorm_runtime_objetivo (
  id_objetivo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sesion BIGINT UNSIGNED NOT NULL,
  objetivo_id VARCHAR(255) NOT NULL,
  puntuacion_raw DECIMAL(10, 4) NULL,
  puntuacion_min DECIMAL(10, 4) NULL,
  puntuacion_max DECIMAL(10, 4) NULL,
  estado_exito VARCHAR(32) NULL,
  estado_completado VARCHAR(32) NULL,
  medida_progreso DECIMAL(10, 4) NULL,
  descripcion MEDIUMTEXT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_objetivo),
  KEY idx_objetivo_sesion (id_sesion),
  KEY idx_objetivo_id (objetivo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scorm_runtime_comentario (
  id_comentario BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sesion BIGINT UNSIGNED NOT NULL,
  tipo_comentario VARCHAR(32) NOT NULL DEFAULT 'aprendiz',
  texto_comentario MEDIUMTEXT NOT NULL,
  ubicacion VARCHAR(255) NULL,
  marca_tiempo VARCHAR(64) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_comentario),
  KEY idx_comentario_sesion (id_sesion),
  KEY idx_comentario_tipo (tipo_comentario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scorm_sco (
  id_sco BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_proyecto BIGINT UNSIGNED NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion MEDIUMTEXT NULL,
  archivo_entrada VARCHAR(512) NOT NULL,
  ancho INT UNSIGNED NULL,
  alto INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sco),
  KEY idx_sco_proyecto (id_proyecto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scorm_sco_archivo (
  id_sco_archivo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_sco BIGINT UNSIGNED NOT NULL,
  id_archivo BIGINT UNSIGNED NULL,
  ruta_relativa VARCHAR(512) NOT NULL,
  es_entrada TINYINT(1) NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sco_archivo),
  KEY idx_sco_archivo_sco (id_sco),
  KEY idx_sco_archivo_archivo (id_archivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
