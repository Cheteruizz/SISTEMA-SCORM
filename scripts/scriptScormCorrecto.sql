DROP DATABASE IF EXISTS scorm_db;
CREATE DATABASE scorm_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE scorm_db;

-- =========================
-- 1. USUARIO
-- =========================
CREATE TABLE usuario (
    id_usuario       INT AUTO_INCREMENT PRIMARY KEY,
    nombre           VARCHAR(100) NOT NULL,
    email            VARCHAR(150) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    rol              ENUM('admin','autor') NOT NULL DEFAULT 'autor',
    fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- 2. PROYECTO_SCORM
-- =========================
CREATE TABLE proyecto_scorm (
    id_proyecto          INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario           INT NOT NULL,
    titulo               VARCHAR(150) NOT NULL,
    descripcion          TEXT,
    version_scorm        ENUM('1.2','2004_3rd','2004_4th') NOT NULL DEFAULT '1.2',
    estado               ENUM('borrador','en_edicion','generado','publicado') 
                         NOT NULL DEFAULT 'borrador',
    fecha_creacion       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultima_modificacion  DATETIME NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 3. METADATOS DEL CURSO
-- =========================
CREATE TABLE proyecto_metadata (
    id_metadata     INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto     INT NOT NULL,
    idioma          VARCHAR(10) DEFAULT 'es',
    autor_principal VARCHAR(150),
    organizacion    VARCHAR(150),
    entidad_publicadora VARCHAR(150),
    palabras_clave  VARCHAR(255),
    nivel_dificultad VARCHAR(50),
    objetivo        TEXT,
    descripcion_detallada TEXT,
    FOREIGN KEY(id_proyecto) REFERENCES proyecto_scorm(id_proyecto)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 4. MANIFEST
-- =========================
CREATE TABLE manifest (
    id_manifest       INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto       INT NOT NULL,
    identificador     VARCHAR(150) NOT NULL,
    version           VARCHAR(50),
    xmlns             VARCHAR(255),
    schema_def        VARCHAR(255),
    schema_version    VARCHAR(50),
    fecha_generacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(id_proyecto) REFERENCES proyecto_scorm(id_proyecto)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 5. ORGANIZACION SCORM
-- =========================
CREATE TABLE organizacion (
    id_organizacion   INT AUTO_INCREMENT PRIMARY KEY,
    id_manifest       INT NOT NULL,
    identificador     VARCHAR(150) NOT NULL,
    titulo            VARCHAR(255) NOT NULL,
    es_principal      TINYINT(1) DEFAULT 0,
    FOREIGN KEY(id_manifest) REFERENCES manifest(id_manifest)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 6. MÓDULO (lo que ve tu usuario)
-- =========================
CREATE TABLE modulo (
    id_modulo        INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto      INT NOT NULL,
    nombre_modulo    VARCHAR(150) NOT NULL,
    descripcion      TEXT,
    duracion_minutos INT,
    codigo_modulo    VARCHAR(100),
    FOREIGN KEY(id_proyecto) REFERENCES proyecto_scorm(id_proyecto)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 7. LECCIÓN (pertenece a un módulo)
-- =========================
CREATE TABLE leccion (
    id_leccion        INT AUTO_INCREMENT PRIMARY KEY,
    id_modulo         INT NOT NULL,
    nombre_leccion    VARCHAR(150) NOT NULL,
    tipo_leccion      VARCHAR(50) NOT NULL,
    descripcion       TEXT,
    duracion_minutos  INT,
    codigo_leccion    VARCHAR(100),
    FOREIGN KEY(id_modulo) REFERENCES modulo(id_modulo)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 8. ITEM SCORM (estructura árbol)
-- =========================
CREATE TABLE item (
    id_item          INT AUTO_INCREMENT PRIMARY KEY,
    id_organizacion  INT NOT NULL,
    id_padre         INT NULL,
    identificador    VARCHAR(150) NOT NULL,
    titulo           VARCHAR(255) NOT NULL,
    tipo_item        ENUM('modulo','leccion','agrupador','sco','asset') 
                     NOT NULL DEFAULT 'sco',
    orden            INT NOT NULL DEFAULT 1,
    es_lanzable      TINYINT(1) DEFAULT 1,
    id_modulo        INT NULL,
    id_leccion       INT NULL,
    id_recurso       INT NULL,
    FOREIGN KEY(id_organizacion) REFERENCES organizacion(id_organizacion)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY(id_padre) REFERENCES item(id_item)
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY(id_modulo) REFERENCES modulo(id_modulo)
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY(id_leccion) REFERENCES leccion(id_leccion)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 9. ARCHIVOS SUBIDOS
-- =========================
CREATE TABLE archivo (
    id_archivo        INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto       INT NOT NULL,
    id_leccion        INT NULL,
    nombre_original   VARCHAR(255) NOT NULL,
    nombre_fisico     VARCHAR(255) NOT NULL,
    tipo_mime         VARCHAR(100) NOT NULL,
    tamano_bytes      INT UNSIGNED,
    ruta              VARCHAR(255) NOT NULL,
    fecha_subida      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(id_proyecto) REFERENCES proyecto_scorm(id_proyecto)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY(id_leccion) REFERENCES leccion(id_leccion)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- 10. RECURSOS SCORM (equivalen a <resource>)
-- =========================
CREATE TABLE recurso (
    id_recurso      INT AUTO_INCREMENT PRIMARY KEY,
    id_manifest     INT NOT NULL,
    id_archivo      INT NOT NULL,
    identificador   VARCHAR(150) NOT NULL,
    href            VARCHAR(255) NOT NULL,
    tipo_recurso    VARCHAR(50) NOT NULL,
    scorm_type      ENUM('sco','asset') NOT NULL DEFAULT 'sco',
    parametros      VARCHAR(255),
    FOREIGN KEY(id_manifest) REFERENCES manifest(id_manifest)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY(id_archivo) REFERENCES archivo(id_archivo)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE item
  ADD CONSTRAINT fk_item_recurso FOREIGN KEY(id_recurso)
  REFERENCES recurso(id_recurso)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- =========================
-- 11. PAQUETES GENERADOS (historial)
-- =========================
CREATE TABLE paquete_generado (
    id_paquete       INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto      INT NOT NULL,
    ruta_zip         VARCHAR(255) NOT NULL,
    version_scorm    ENUM('1.2','2004_3rd','2004_4th') NOT NULL,
    lms_destino      VARCHAR(100),
    fecha_generado   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(id_proyecto) REFERENCES proyecto_scorm(id_proyecto)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
