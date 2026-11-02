ALTER TABLE usuarios
    ADD COLUMN debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0;
