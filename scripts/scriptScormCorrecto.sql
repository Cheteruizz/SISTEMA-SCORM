
CREATE TABLE USUARIO (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    correo_electronico VARCHAR(200),
    apellido VARCHAR(100),
    contrasena VARCHAR(255)
);



CREATE TABLE PROYECTO_SCORM (
    id_proyecto INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_proyecto VARCHAR(150),
    version VARCHAR(50),
    fecha_creacion DATETIME,
    fecha_modificacion DATETIME,
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario)
        ON DELETE CASCADE
);



CREATE TABLE ORGANIZACION (
    id_organizacion INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    identifier VARCHAR(100),
    title VARCHAR(150),
    estructura TEXT,
    FOREIGN KEY (id_proyecto) REFERENCES PROYECTO_SCORM(id_proyecto)
        ON DELETE CASCADE
);


CREATE TABLE ITEM (
    id_item INT AUTO_INCREMENT PRIMARY KEY,
    id_organizacion INT NOT NULL,
    parent_item INT NULL,
    isvisible BOOLEAN,
    title VARCHAR(150),
    identifier VARCHAR(150),
    parameters VARCHAR(255),
    identifierref VARCHAR(150),
    FOREIGN KEY (id_organizacion) REFERENCES ORGANIZACION(id_organizacion)
        ON DELETE CASCADE,
    FOREIGN KEY (parent_item) REFERENCES ITEM(id_item)
        ON DELETE CASCADE
);

CREATE TABLE RECURSO (
    id_recurso INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    identifier VARCHAR(150),
    type VARCHAR(50),
    scorm_type VARCHAR(50),
    href VARCHAR(255),
    FOREIGN KEY (id_proyecto) REFERENCES PROYECTO_SCORM(id_proyecto)
        ON DELETE CASCADE
);

CREATE TABLE ARCHIVO (
    id_archivo INT AUTO_INCREMENT PRIMARY KEY,
    id_recurso INT NOT NULL,
    nombre_archivo VARCHAR(200),
    ruta VARCHAR(255),
    tamano INT,
    tipo VARCHAR(50),
    FOREIGN KEY (id_recurso) REFERENCES RECURSO(id_recurso)
        ON DELETE CASCADE
);

CREATE TABLE MANIFEST (
    id_manifest INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL UNIQUE,
    contenido_xml TEXT,
    fecha_generado DATETIME,
    FOREIGN KEY (id_proyecto) REFERENCES PROYECTO_SCORM(id_proyecto)
        ON DELETE CASCADE
);
