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
    upd DATE
);

CREATE TABLE updates (
    id INT PRIMARY KEY,
    action TEXT,
    changed_id INT,
    time DATE
);