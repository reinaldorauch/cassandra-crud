CREATE KEYSPACE api WITH REPLICATION = {
    'class' : 'SimpleStrategy',
    'replication_factor' : 1
};

USE api;

CREATE TABLE people (
    id INT PRIMARY KEY,
    name TEXT,
    city TEXT,
    email TEXT,
    upd TIMESTAMP
);

CREATE TABLE updates (
    id TEXT,
    action TEXT,
    changed_id INT,
    time TIMESTAMP,
    PRIMARY KEY(id, time)
);