CREATE TABLE role_list_role (
    id SERIAL PRIMARY KEY,
    external_id TEXT NOT NULL,
    role_list_id INTEGER REFERENCES role_list(id) NOT NULL
);